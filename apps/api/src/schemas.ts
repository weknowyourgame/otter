// Request-body validation for apps/api's routes. Replaces the hand-rolled
// per-field checks index.ts had — zod gives structured error messages and a
// single place to see the actual shape each route expects, instead of
// re-deriving it from scattered `if (!body.x)` guards.

import { z } from "zod";

export const createApiKeyBodySchema = z
	.object({
		name: z.string().trim().min(1).max(80),
		type: z.enum(["public", "secret"]),
		mode: z.enum(["test", "live"]),
	})
	.strict();

export const replaceOriginsBodySchema = z
	.object({
		origins: z.array(z.string()).max(20),
	})
	.strict();

export const pauseSessionBodySchema = z
	.object({
		durationMinutes: z.number().int().positive().optional(),
	})
	.strict();

export const createDocBodySchema = z
	.object({
		url: z.string().trim().min(1).url(),
	})
	.strict();

// Mirrors otto-core's PageSnapshot/PageElement/LastActionReport/StepRequestUser
// (packages/core/src/types.ts) — kept dependency-free rather than importing
// otto-core's types directly, same reasoning packages/sdk/src/types.ts gives
// for mirroring instead of importing: this is a wire contract, not a shared
// implementation, and the two sides should be free to evolve independently
// without a build-order dependency between apps/api and otto-core's types.
const pageElementSchema = z
	.object({
		ref: z.number(),
		role: z.string(),
		name: z.string(),
		href: z.string().optional(),
		state: z
			.object({
				disabled: z.boolean().optional(),
				checked: z.boolean().optional(),
				selected: z.boolean().optional(),
				expanded: z.boolean().optional(),
				value: z.string().optional(),
			})
			.strict()
			.optional(),
		inViewport: z.boolean().optional(),
	})
	.strict();

const pageSnapshotSchema = z
	.object({
		url: z.string(),
		path: z.string(),
		title: z.string(),
		headings: z.array(z.string()),
		elements: z.array(pageElementSchema),
	})
	.strict();

const lastActionReportSchema = z
	.object({
		ok: z.boolean(),
		error: z.string().optional(),
	})
	.strict();

const stepRequestUserSchema = z
	.object({
		email: z.string().optional(),
		name: z.string().optional(),
	})
	.strict();

export const stepRequestBodySchema = z
	.object({
		sessionId: z.string().optional(),
		message: z.string().max(4000).optional(),
		snapshot: pageSnapshotSchema,
		lastAction: lastActionReportSchema.optional(),
		user: stepRequestUserSchema.optional(),
	})
	.strict();

export type StepRequestBody = z.infer<typeof stepRequestBodySchema>;

// ws.ts's message envelope: the same step body, plus the socket-only
// type/requestId fields used to correlate a reply to its request.
export const wsStepMessageSchema = stepRequestBodySchema.extend({
	type: z.literal("step"),
	requestId: z.string(),
});

export type WsStepMessage = z.infer<typeof wsStepMessageSchema>;
