import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "./connection.js";
import {
	type ApiKeyRow,
	allowedOrigins,
	apiKeys,
	type NewAllowedOriginRow,
	type NewApiKeyRow,
	type NewTenantInviteRow,
	type TenantInviteRow,
	type TenantRow,
	tenantInvites,
	tenantMembers,
	tenants,
	user,
} from "./schema.js";

export type TenantAccess = {
	tenant: TenantRow;
	role: "owner" | "member";
};

export async function getTenantById(
	tenantId: string,
): Promise<TenantRow | undefined> {
	const db = await getDb();
	const rows = await db
		.select()
		.from(tenants)
		.where(eq(tenants.id, tenantId))
		.limit(1);
	return rows[0];
}

export async function getTenantForUser(
	userId: string,
): Promise<TenantAccess | undefined> {
	const db = await getDb();
	const rows = await db
		.select({ tenant: tenants, role: tenantMembers.role })
		.from(tenantMembers)
		.innerJoin(tenants, eq(tenantMembers.tenantId, tenants.id))
		.where(eq(tenantMembers.userId, userId))
		.limit(1);
	const row = rows[0];
	return row ? { tenant: row.tenant, role: row.role } : undefined;
}

export async function createTenantForUser(input: {
	userId: string;
	name: string;
	slug: string;
}): Promise<TenantAccess> {
	const existing = await getTenantForUser(input.userId);
	if (existing) return existing;

	const now = Date.now();
	const tenant: TenantRow = {
		id: crypto.randomUUID(),
		name: input.name,
		slug: input.slug,
		createdAt: now,
	};
	const db = await getDb();
	await db.transaction(async (tx) => {
		await tx.insert(tenants).values(tenant);
		await tx.insert(tenantMembers).values({
			id: crypto.randomUUID(),
			tenantId: tenant.id,
			userId: input.userId,
			role: "owner",
			createdAt: now,
		});
	});
	return { tenant, role: "owner" };
}

export async function updateTenantName(
	tenantId: string,
	name: string,
	slug: string,
): Promise<TenantRow> {
	const db = await getDb();
	const rows = await db
		.update(tenants)
		.set({ name, slug })
		.where(eq(tenants.id, tenantId))
		.returning();
	return rows[0] as TenantRow;
}

export type TenantMemberWithUser = {
	userId: string;
	name: string;
	email: string;
	role: "owner" | "member";
	createdAt: number;
};

export async function listTenantMembers(
	tenantId: string,
): Promise<TenantMemberWithUser[]> {
	const db = await getDb();
	return db
		.select({
			userId: tenantMembers.userId,
			name: user.name,
			email: user.email,
			role: tenantMembers.role,
			createdAt: tenantMembers.createdAt,
		})
		.from(tenantMembers)
		.innerJoin(user, eq(tenantMembers.userId, user.id))
		.where(eq(tenantMembers.tenantId, tenantId))
		.orderBy(asc(tenantMembers.createdAt));
}

export async function countTenantOwners(tenantId: string): Promise<number> {
	const db = await getDb();
	const rows = await db
		.select({ userId: tenantMembers.userId })
		.from(tenantMembers)
		.where(
			and(
				eq(tenantMembers.tenantId, tenantId),
				eq(tenantMembers.role, "owner"),
			),
		);
	return rows.length;
}

/** Returns true if a row was actually deleted (tenant-scoped, so cross-tenant removal is impossible). */
export async function removeTenantMember(
	tenantId: string,
	userId: string,
): Promise<boolean> {
	const db = await getDb();
	const rows = await db
		.delete(tenantMembers)
		.where(
			and(
				eq(tenantMembers.tenantId, tenantId),
				eq(tenantMembers.userId, userId),
			),
		)
		.returning({ id: tenantMembers.id });
	return rows.length > 0;
}

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

function generateInviteToken(): string {
	return `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
}

export async function createTenantInvite(input: {
	tenantId: string;
	email: string;
	role: "owner" | "member";
	invitedBy: string;
}): Promise<TenantInviteRow> {
	const now = Date.now();
	const row: NewTenantInviteRow = {
		id: crypto.randomUUID(),
		tenantId: input.tenantId,
		email: input.email.trim().toLowerCase(),
		role: input.role,
		token: generateInviteToken(),
		invitedBy: input.invitedBy,
		createdAt: now,
		expiresAt: now + INVITE_EXPIRY_MS,
		acceptedAt: null,
	};
	const db = await getDb();
	await db.insert(tenantInvites).values(row);
	return row as TenantInviteRow;
}

export async function listPendingInvites(
	tenantId: string,
): Promise<TenantInviteRow[]> {
	const db = await getDb();
	return db
		.select()
		.from(tenantInvites)
		.where(
			and(
				eq(tenantInvites.tenantId, tenantId),
				isNull(tenantInvites.acceptedAt),
			),
		)
		.orderBy(asc(tenantInvites.createdAt));
}

export async function getTenantInviteByToken(
	token: string,
): Promise<TenantInviteRow | undefined> {
	const db = await getDb();
	const rows = await db
		.select()
		.from(tenantInvites)
		.where(eq(tenantInvites.token, token))
		.limit(1);
	return rows[0];
}

/** Returns true if a row was actually deleted (tenant-scoped, so cross-tenant revocation is impossible). */
export async function revokeTenantInvite(
	id: string,
	tenantId: string,
): Promise<boolean> {
	const db = await getDb();
	const rows = await db
		.delete(tenantInvites)
		.where(and(eq(tenantInvites.id, id), eq(tenantInvites.tenantId, tenantId)))
		.returning({ id: tenantInvites.id });
	return rows.length > 0;
}

export type AcceptInviteResult =
	| { ok: true; tenantId: string }
	| {
			ok: false;
			error:
				| "invite_not_found"
				| "invite_expired"
				| "invite_already_accepted"
				| "user_already_in_tenant";
	  };

/**
 * Otto's dashboard assumes one tenant per user (see getTenantForUser) — a
 * user who already belongs to any tenant is rejected rather than silently
 * added to a second one, which requireDashboard's single-tenant lookup
 * couldn't represent correctly anyway.
 */
export async function acceptTenantInvite(
	token: string,
	userId: string,
): Promise<AcceptInviteResult> {
	const invite = await getTenantInviteByToken(token);
	if (!invite) return { ok: false, error: "invite_not_found" };
	if (invite.acceptedAt) return { ok: false, error: "invite_already_accepted" };
	if (invite.expiresAt < Date.now())
		return { ok: false, error: "invite_expired" };

	const db = await getDb();
	const existing = await getTenantForUser(userId);

	// Better Auth's databaseHooks.user.create.after (see auth.ts) auto-creates
	// a solo workspace for every signup, unconditionally — including someone
	// who signed up specifically to accept this invite. A brand-new, still-
	// solo auto-created tenant is safe to discard in favor of the one they're
	// actually joining; a tenant with other real members is a genuine
	// workspace and must not be silently abandoned.
	if (existing) {
		const membersInExisting = await db
			.select({ userId: tenantMembers.userId })
			.from(tenantMembers)
			.where(eq(tenantMembers.tenantId, existing.tenant.id));
		if (membersInExisting.length > 1) {
			return { ok: false, error: "user_already_in_tenant" };
		}
	}

	const now = Date.now();
	await db.transaction(async (tx) => {
		if (existing) {
			await tx
				.delete(tenantMembers)
				.where(
					and(
						eq(tenantMembers.tenantId, existing.tenant.id),
						eq(tenantMembers.userId, userId),
					),
				);
			await tx.delete(tenants).where(eq(tenants.id, existing.tenant.id));
		}
		await tx.insert(tenantMembers).values({
			id: crypto.randomUUID(),
			tenantId: invite.tenantId,
			userId,
			role: invite.role,
			createdAt: now,
		});
		await tx
			.update(tenantInvites)
			.set({ acceptedAt: now })
			.where(eq(tenantInvites.id, invite.id));
	});
	return { ok: true, tenantId: invite.tenantId };
}

export async function insertApiKey(row: NewApiKeyRow): Promise<ApiKeyRow> {
	const db = await getDb();
	const rows = await db.insert(apiKeys).values(row).returning();
	return rows[0] as ApiKeyRow;
}

export async function listApiKeysForTenant(
	tenantId: string,
): Promise<ApiKeyRow[]> {
	const db = await getDb();
	return db
		.select()
		.from(apiKeys)
		.where(and(eq(apiKeys.tenantId, tenantId), isNull(apiKeys.revokedAt)))
		.orderBy(asc(apiKeys.createdAt));
}

export async function getActiveApiKeyByHash(
	keyHash: string,
): Promise<ApiKeyRow | undefined> {
	const db = await getDb();
	const rows = await db
		.select()
		.from(apiKeys)
		.where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
		.limit(1);
	return rows[0];
}

export async function revokeApiKey(
	id: string,
	tenantId: string,
): Promise<boolean> {
	const db = await getDb();
	const rows = await db
		.update(apiKeys)
		.set({ revokedAt: Date.now() })
		.where(
			and(
				eq(apiKeys.id, id),
				eq(apiKeys.tenantId, tenantId),
				isNull(apiKeys.revokedAt),
			),
		)
		.returning({ id: apiKeys.id });
	return rows.length > 0;
}

export async function touchApiKey(id: string): Promise<void> {
	const db = await getDb();
	await db
		.update(apiKeys)
		.set({ lastUsedAt: Date.now() })
		.where(eq(apiKeys.id, id));
}

export async function listAllowedOrigins(tenantId: string): Promise<string[]> {
	const db = await getDb();
	const rows = await db
		.select({ origin: allowedOrigins.origin })
		.from(allowedOrigins)
		.where(eq(allowedOrigins.tenantId, tenantId))
		.orderBy(asc(allowedOrigins.origin));
	return rows.map((row) => row.origin);
}

export async function replaceAllowedOrigins(
	tenantId: string,
	origins: string[],
): Promise<string[]> {
	const now = Date.now();
	const rows: NewAllowedOriginRow[] = origins.map((origin) => ({
		id: crypto.randomUUID(),
		tenantId,
		origin,
		createdAt: now,
	}));
	const db = await getDb();
	await db.transaction(async (tx) => {
		await tx
			.delete(allowedOrigins)
			.where(eq(allowedOrigins.tenantId, tenantId));
		if (rows.length > 0) await tx.insert(allowedOrigins).values(rows);
	});
	return origins;
}
