UPDATE "agents" SET "model" = 'openai/gpt-5.3-codex' WHERE "model" <> 'openai/gpt-5.3-codex';--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "model" SET DEFAULT 'openai/gpt-5.3-codex';
