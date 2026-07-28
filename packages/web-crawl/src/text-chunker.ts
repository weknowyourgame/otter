// Naive paragraph-aware chunker — no token counting, just a character
// budget. Good enough to get retrieval working; revisit if chunk boundaries
// turn out to cut across meaningful content once there's real usage data.

const TARGET_CHUNK_SIZE = 1000;
const MIN_CHUNK_SIZE = 50;

export function chunkMarkdown(markdown: string): string[] {
	const paragraphs = markdown
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
