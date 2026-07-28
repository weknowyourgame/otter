// A pluggable interface, not a hard otter-redis dependency — otter-core has
// stayed infra-free everywhere else (otter-db is a local SQLite file, not a
// server), and every runStep() call would hit this, so a hard Redis
// dependency here would break the zero-infra demo path whenever Redis isn't
// running. apps/api constructs the real Redis-backed implementation and passes
// it in via EngineConfig.pauseStore; if the caller doesn't provide one,
// sessions are simply never paused.
export interface PauseStore {
	isPaused(sessionId: string): Promise<boolean>;
	pause(sessionId: string, durationMs: number): Promise<void>;
	resume(sessionId: string): Promise<void>;
}
