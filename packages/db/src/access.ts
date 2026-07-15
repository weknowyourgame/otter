import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "./connection.js";
import {
	type ApiKeyRow,
	allowedOrigins,
	apiKeys,
	type NewAllowedOriginRow,
	type NewApiKeyRow,
	type TenantRow,
	tenantMembers,
	tenants,
} from "./schema.js";

export type TenantAccess = {
	tenant: TenantRow;
	role: "owner" | "member";
};

export async function getTenantForUser(userId: string): Promise<TenantAccess | undefined> {
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

export async function createTenantForUser(input: { userId: string; name: string; slug: string }): Promise<TenantAccess> {
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

export async function insertApiKey(row: NewApiKeyRow): Promise<ApiKeyRow> {
	const db = await getDb();
	const rows = await db.insert(apiKeys).values(row).returning();
	return rows[0] as ApiKeyRow;
}

export async function listApiKeysForTenant(tenantId: string): Promise<ApiKeyRow[]> {
	const db = await getDb();
	return db
		.select()
		.from(apiKeys)
		.where(and(eq(apiKeys.tenantId, tenantId), isNull(apiKeys.revokedAt)))
		.orderBy(asc(apiKeys.createdAt));
}

export async function getActiveApiKeyByHash(keyHash: string): Promise<ApiKeyRow | undefined> {
	const db = await getDb();
	const rows = await db
		.select()
		.from(apiKeys)
		.where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
		.limit(1);
	return rows[0];
}

export async function revokeApiKey(id: string, tenantId: string): Promise<boolean> {
	const db = await getDb();
	const rows = await db
		.update(apiKeys)
		.set({ revokedAt: Date.now() })
		.where(and(eq(apiKeys.id, id), eq(apiKeys.tenantId, tenantId), isNull(apiKeys.revokedAt)))
		.returning({ id: apiKeys.id });
	return rows.length > 0;
}

export async function touchApiKey(id: string): Promise<void> {
	const db = await getDb();
	await db.update(apiKeys).set({ lastUsedAt: Date.now() }).where(eq(apiKeys.id, id));
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

export async function replaceAllowedOrigins(tenantId: string, origins: string[]): Promise<string[]> {
	const now = Date.now();
	const rows: NewAllowedOriginRow[] = origins.map((origin) => ({
		id: crypto.randomUUID(),
		tenantId,
		origin,
		createdAt: now,
	}));
	const db = await getDb();
	await db.transaction(async (tx) => {
		await tx.delete(allowedOrigins).where(eq(allowedOrigins.tenantId, tenantId));
		if (rows.length > 0) await tx.insert(allowedOrigins).values(rows);
	});
	return origins;
}
