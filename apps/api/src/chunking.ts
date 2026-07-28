// Naive paragraph-aware chunker, same approach as packages/web-crawl/src/text-chunker.ts
// (kept as a separate small copy rather than a shared package import — apps/api
// and apps/workers are independently deployable, and this is a few lines of
// pure logic, not worth a build-order dependency between them).

const TARGET_CHUNK_SIZE = 1000;
const MIN_CHUNK_SIZE = 50;

export function chunkText(text: string): string[] {
	const paragraphs = text
		.split(/\n{2,}/)
		.map((p) => p.trim())
		.filter(Boolean);

	const chunks: string[] = [];
	let current = "";

	for (const paragraph of paragraphs) {
		const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
		if (
			candidate.length > TARGET_CHUNK_SIZE &&
			current.length >= MIN_CHUNK_SIZE
		) {
			chunks.push(current);
			current = paragraph;
		} else {
			current = candidate;
		}
	}
	if (current) chunks.push(current);

	return chunks;
}
