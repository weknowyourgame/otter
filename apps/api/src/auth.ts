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
import {
	resetPasswordEmailHtml,
	sendEmail,
	verificationEmailHtml,
} from "./email.js";

function configuredSecret(): string {
	const secret = process.env.BETTER_AUTH_SECRET?.trim();
	if (!secret) throw Error("Secret not found");
	return secret;
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

// Top-level await: getDb() is async under the Postgres driver (was
// synchronous under bun:sqlite), and better-auth's drizzleAdapter needs the
// live db instance up front, not a Promise of one. Bun's runtime supports
// top-level await natively regardless of the tsconfig module target.
const db = await getDb();

export const auth = betterAuth({
	baseURL: process.env.BETTER_AUTH_URL?.trim() || "http://localhost:8787",
	secret: configuredSecret(),
	basePath: "/api/auth",
	database: drizzleAdapter(db, {
		provider: "pg",
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
					await createTenantForUser({
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
		requireEmailVerification: true,
		sendResetPassword: async ({ user: resetUser, url }) => {
			await sendEmail({
				to: resetUser.email,
				subject: "Reset your Otto password",
				html: resetPasswordEmailHtml(url),
			});
		},
	},
	emailVerification: {
		sendOnSignUp: true,
		autoSignInAfterVerification: true,
		sendVerificationEmail: async ({ user: verifyUser, url }) => {
			await sendEmail({
				to: verifyUser.email,
				subject: "Verify your Otto email",
				html: verificationEmailHtml(url),
			});
		},
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
