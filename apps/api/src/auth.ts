import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import {
	account,
	authSession,
	createTenantForUser,
	getDb,
	user,
	verification,
} from "otto-db";

const DEFAULT_DEV_SECRET = "otto-local-auth-secret-change-before-production";

function configuredSecret(): string {
	const secret = process.env.BETTER_AUTH_SECRET?.trim();
	if (secret) return secret;
	if (process.env.NODE_ENV === "production") {
		throw new Error("BETTER_AUTH_SECRET is required in production");
	}
	return DEFAULT_DEV_SECRET;
}

export function dashboardOrigins(): string[] {
	const configured = process.env.OTTO_DASHBOARD_ORIGINS?.split(",")
		.map((origin) => origin.trim())
		.filter(Boolean);
	return configured?.length
		? configured
		: ["http://localhost:3000", "http://localhost:3001"];
}

function tenantSlug(name: string, userId: string): string {
	const base = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 36);
	return `${base || "workspace"}-${userId.slice(0, 8)}`;
}

export const auth = betterAuth({
	baseURL: process.env.BETTER_AUTH_URL?.trim() || "http://localhost:8787",
	secret: configuredSecret(),
	basePath: "/api/auth",
	database: drizzleAdapter(getDb(), {
		provider: "sqlite",
		schema: {
			user,
			session: authSession,
			account,
			verification,
		},
	}),
	databaseHooks: {
		user: {
			create: {
				after: async (createdUser) => {
					createTenantForUser({
						userId: createdUser.id,
						name: `${createdUser.name || "Otto"}'s workspace`,
						slug: tenantSlug(createdUser.name || "workspace", createdUser.id),
					});
				},
			},
		},
	},
	emailAndPassword: {
		enabled: true,
		autoSignIn: true,
	},
	trustedOrigins: dashboardOrigins(),
	advanced: {
		cookiePrefix: "otto-auth",
		useSecureCookies: process.env.NODE_ENV === "production",
		defaultCookieAttributes: {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
			path: "/",
		},
		database: {
			generateId: () => crypto.randomUUID(),
		},
	},
	session: {
		cookieCache: { enabled: true, maxAge: 60 },
	},
});

export type AuthSession = typeof auth.$Infer.Session;
