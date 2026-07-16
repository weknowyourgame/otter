import { statusCodes } from "better-auth";
import { createHmac, randomBytes } from "node:crypto";
import {
	type ApiKeyRow,
	getActiveApiKeyByHash,
	insertApiKey,
	listAllowedOrigins,
	listApiKeysForTenant,
	revokeApiKey,
	touchApiKey,
} from "otto-db";

export type ApiKeyType = "public" | "secret";
export type ApiKeyMode = "test" | "live";

const DEFAULT_DEV_SECRET = "otto-local-api-key-secret-change-before-production";

function hashingSecret(): string {
	const secret = process.env.OTTO_API_KEY_SECRET?.trim();
  if (!secret) throw Error("Secret not found")
  return secret;
}

export function generateApiKey(type: ApiKeyType, mode: ApiKeyMode): string {
	const prefix = type === "public" ? "pk" : "sk";
	return `${prefix}_${mode}_${randomBytes(32).toString("hex")}`;
}

export function hashApiKey(rawKey: string, secret = hashingSecret()): string {
	return createHmac("sha256", secret).update(rawKey).digest("hex");
}

export function isValidApiKeyFormat(rawKey: string): boolean {
	return /^(pk|sk)_(test|live)_[0-9a-f]{64}$/.test(rawKey);
}

export function normalizeOrigin(input: string): string {
	const trimmed = input.trim();
	if (!trimmed || trimmed.includes("*")) throw new Error("invalid_origin");
	const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
		? trimmed
		: `${trimmed.startsWith("localhost") || trimmed.startsWith("127.0.0.1") ? "http" : "https"}://${trimmed}`;
	const url = new URL(candidate);
	if (
		!["http:", "https:"].includes(url.protocol) ||
		url.username ||
		url.password ||
		url.origin === "null"
	) {
		throw new Error("invalid_origin");
	}
	if (url.pathname !== "/" || url.search || url.hash)
		throw new Error("origin_must_not_include_path");
	return url.origin;
}

export async function createApiKey(input: {
	tenantId: string;
	userId: string;
	name: string;
	type: ApiKeyType;
	mode: ApiKeyMode;
}): Promise<{ key: ApiKeyRow; rawKey: string }> {
	const rawKey = generateApiKey(input.type, input.mode);
	const prefix = rawKey.slice(0, rawKey.indexOf("_", 3));
	const key = await insertApiKey({
		id: crypto.randomUUID(),
		tenantId: input.tenantId,
		createdBy: input.userId,
		name: input.name,
		type: input.type,
		mode: input.mode,
		keyHash: hashApiKey(rawKey),
		keyPrefix: prefix,
		lastFour: rawKey.slice(-4),
		createdAt: Date.now(),
	});
	return { key, rawKey };
}

export function serializeApiKey(key: ApiKeyRow) {
	return {
		id: key.id,
		name: key.name,
		type: key.type,
		mode: key.mode,
		maskedKey: `${key.keyPrefix}_${"*".repeat(8)}${key.lastFour}`,
		createdAt: key.createdAt,
		lastUsedAt: key.lastUsedAt,
	};
}

export async function listTenantApiKeys(tenantId: string) {
	const keys = await listApiKeysForTenant(tenantId);
	return keys.map(serializeApiKey);
}

export async function revokeTenantApiKey(id: string, tenantId: string): Promise<boolean> {
	return revokeApiKey(id, tenantId);
}

export type ValidatedApiKey = {
	key: ApiKeyRow;
	origins: string[];
};

export async function validateApiKey(rawKey: string): Promise<ValidatedApiKey | undefined> {
	if (!isValidApiKeyFormat(rawKey)) return undefined;
	const key = await getActiveApiKeyByHash(hashApiKey(rawKey));
	if (!key) return undefined;
	return { key, origins: await listAllowedOrigins(key.tenantId) };
}

export async function markApiKeyUsed(id: string): Promise<void> {
	await touchApiKey(id);
}

/**
 * A widget request may present its key via query param, x-otto-key header,
 * or Authorization: Bearer — but if more than one is present and they
 * disagree about identity, that's a request trying to be ambiguous about
 * who it is, not a client sending redundant proof. Reject rather than
 * silently pick one.
 */
export function extractApiKey(request: Request): string | undefined {
	const url = new URL(request.url);
	const queryKey = url.searchParams.get("key")?.trim();
	const headerKey = request.headers.get("x-otto-key")?.trim();
	const bearer = request.headers
		.get("authorization")
		?.match(/^Bearer\s+(.+)$/i)?.[1]
		?.trim();
	const keys = [queryKey, headerKey, bearer].filter((key): key is string =>
		Boolean(key),
	);
	if (new Set(keys).size > 1) return undefined;
	return keys[0];
}
