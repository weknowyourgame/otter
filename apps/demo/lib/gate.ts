// Shared password-gate helpers (Edge + Node safe: Web Crypto only).
export const GATE_COOKIE = "otter_demo_gate";

export async function gateToken(password: string): Promise<string> {
	const data = new TextEncoder().encode(`${password}:otter-demo-gate-v1`);
	const digest = await crypto.subtle.digest("SHA-256", data);
	return [...new Uint8Array(digest)]
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

export function safeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}
