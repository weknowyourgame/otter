import { describe, expect, it } from "bun:test";
import { chunkText } from "./chunking.js";

describe("chunkText", () => {
	it("keeps short text as a single chunk", () => {
		const chunks = chunkText("Q: Can I use this?\nA: Yes, absolutely.");
		expect(chunks).toHaveLength(1);
		expect(chunks[0]).toContain("Q: Can I use this?");
	});

	it("splits long content into multiple paragraph-bounded chunks", () => {
		const paragraph = "x".repeat(600);
		const longText = [paragraph, paragraph, paragraph].join("\n\n");
		const chunks = chunkText(longText);
		expect(chunks.length).toBeGreaterThan(1);
		for (const chunk of chunks) {
			expect(chunk.length).toBeGreaterThan(0);
		}
	});

	it("drops blank paragraphs and empty input", () => {
		expect(chunkText("")).toEqual([]);
		expect(chunkText("\n\n\n")).toEqual([]);
	});
});
