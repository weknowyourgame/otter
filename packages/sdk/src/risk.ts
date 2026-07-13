// Destructive-action gate. Unlike the consent grant (once per session),
// anything matching here gets its own explicit confirmation card every
// time, no matter what the backend planned. Not configurable off.

const DESTRUCTIVE_PHRASES = [
	"delete",
	"remove",
	"revoke",
	"deactivate",
	"disable account",
	"close account",
	"cancel subscription",
	"cancel plan",
	"downgrade",
	"upgrade",
	"pay",
	"payment",
	"purchase",
	"buy now",
	"checkout",
	"subscribe",
	"transfer",
	"charge",
	"reset password",
	"change password",
	"sign out everywhere",
	"log out everywhere",
];

export function describeRisk(el: HTMLElement, extraWords: string[]): string | null {
	const text = `${el.innerText ?? ""} ${el.getAttribute("aria-label") ?? ""} ${el.getAttribute("name") ?? ""} ${el.id ?? ""}`
		.toLowerCase()
		.replace(/\s+/g, " ");

	for (const phrase of [...DESTRUCTIVE_PHRASES, ...extraWords]) {
		if (phrase && text.includes(phrase.toLowerCase())) return phrase;
	}
	return null;
}

/** Password fields are never auto-filled silently. */
export function isSensitiveInput(el: HTMLElement): boolean {
	return el instanceof HTMLInputElement && el.type === "password";
}
