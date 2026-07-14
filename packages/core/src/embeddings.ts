// Raw fetch, no AI SDK — matches llm.ts's style. Cossistant reaches
// OpenRouter's embeddings endpoint through the Vercel AI SDK's embed/embedMany
// (they already depend on it broadly for streaming generation elsewhere);
// otto-core deliberately has zero AI SDK dependency and does one raw fetch
// per chat completion, so a second dependency just for this one call would
// break that "only LLM-provider code, kept minimal" design otto-core's own
// package.json describes. Reuses the same OPENROUTER_API_KEY as chat calls —
// OpenRouter's embeddings endpoint is OpenAI-compatible and needs no
// separate credential.

const DEFAULT_EMBEDDING_MODEL = "openai/text-embedding-3-small";

export async function requestEmbedding(
	text: string,
	apiKey: string,
	model: string = DEFAULT_EMBEDDING_MODEL,
): Promise<number[]> {
	const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
		method: "POST",
		headers: {
			authorization: `Bearer ${apiKey}`,
			"content-type": "application/json",
			"x-title": "Otto Agent",
		},
		body: JSON.stringify({ model, input: text }),
	});

	if (!res.ok) {
		const errText = await res.text().catch(() => "");
		throw new Error(`openrouter_embedding_${res.status}: ${errText.slice(0, 300)}`);
	}

	const body = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
	const embedding = body.data?.[0]?.embedding;
	if (!embedding) throw new Error("openrouter_embedding_empty_response");
	return embedding;
}
