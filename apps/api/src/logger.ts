import pino from "pino";

// Pretty-printed in dev (readable while running `bun run dev`), plain
// newline-delimited JSON in production — the shape a log aggregator
// actually wants, and what "structured logging" means in practice.
export const logger = pino({
	level: process.env.LOG_LEVEL?.trim() || "info",
	...(process.env.NODE_ENV === "production"
		? {}
		: {
				transport: {
					target: "pino-pretty",
					options: {
						colorize: true,
						translateTime: "HH:MM:ss",
						ignore: "pid,hostname",
					},
				},
			}),
});
