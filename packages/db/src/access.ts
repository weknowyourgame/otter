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

export function getTenantForUser(userId: string): TenantAccess | undefined {
	const row = getDb()
		.select({ tenant: tenants, role: tenantMembers.role })
		.from(tenantMembers)
		.innerJoin(tenants, eq(tenantMembers.tenantId, tenants.id))
		.where(eq(tenantMembers.userId, userId))
		.get();
	return row ? { tenant: row.tenant, role: row.role } : undefined;
}

export function createTenantForUser(input: {
	userId: string;
	name: string;
	slug: string;
}): TenantAccess {
	const existing = getTenantForUser(input.userId);
	if (existing) return existing;

	const now = Date.now();
	const tenant: TenantRow = {
		id: crypto.randomUUID(),
		name: input.name,
		slug: input.slug,
		createdAt: now,
	};
	getDb().transaction((tx) => {
		tx.insert(tenants).values(tenant).run();
		tx.insert(tenantMembers)
			.values({
				id: crypto.randomUUID(),
				tenantId: tenant.id,
				userId: input.userId,
				role: "owner",
				createdAt: now,
			})
			.run();
	});
	return { tenant, role: "owner" };
}

export function insertApiKey(row: NewApiKeyRow): ApiKeyRow {
	return getDb().insert(apiKeys).values(row).returning().get();
}

export function listApiKeysForTenant(tenantId: string): ApiKeyRow[] {
	return getDb()
		.select()
		.from(apiKeys)
		.where(and(eq(apiKeys.tenantId, tenantId), isNull(apiKeys.revokedAt)))
		.orderBy(asc(apiKeys.createdAt))
		.all();
}

export function getActiveApiKeyByHash(keyHash: string): ApiKeyRow | undefined {
	return getDb()
		.select()
		.from(apiKeys)
		.where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
		.get();
}

export function revokeApiKey(id: string, tenantId: string): boolean {
	const rows = getDb()
		.update(apiKeys)
		.set({ revokedAt: Date.now() })
		.where(
			and(
				eq(apiKeys.id, id),
				eq(apiKeys.tenantId, tenantId),
				isNull(apiKeys.revokedAt),
			),
		)
		.returning({ id: apiKeys.id })
		.all();
	return rows.length > 0;
}

export function touchApiKey(id: string): void {
	getDb()
		.update(apiKeys)
		.set({ lastUsedAt: Date.now() })
		.where(eq(apiKeys.id, id))
		.run();
}

export function listAllowedOrigins(tenantId: string): string[] {
	return getDb()
		.select({ origin: allowedOrigins.origin })
		.from(allowedOrigins)
		.where(eq(allowedOrigins.tenantId, tenantId))
		.orderBy(asc(allowedOrigins.origin))
		.all()
		.map((row) => row.origin);
}

export function replaceAllowedOrigins(
	tenantId: string,
	origins: string[],
): string[] {
	const now = Date.now();
	const rows: NewAllowedOriginRow[] = origins.map((origin) => ({
		id: crypto.randomUUID(),
		tenantId,
		origin,
		createdAt: now,
	}));
	getDb().transaction((tx) => {
		tx.delete(allowedOrigins)
			.where(eq(allowedOrigins.tenantId, tenantId))
			.run();
		if (rows.length > 0) tx.insert(allowedOrigins).values(rows).run();
	});
	return origins;
}
