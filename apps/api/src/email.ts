// Raw fetch against Resend's REST API — no SDK dependency, same reasoning
// otto-core's embeddings.ts gives for calling OpenRouter directly. Gracefully
// no-ops (logs instead of throwing) when RESEND_API_KEY isn't configured yet,
// matching FirecrawlService's "not configured" pattern: a missing optional
// credential shouldn't break the auth flow that calls this, just skip the
// actual send and make it obvious in the logs why no email arrived.

import { logger } from "./logger.js";

const RESEND_API_URL = "https://api.resend.com/emails";

function isConfigured(): boolean {
	return Boolean(process.env.RESEND_API_KEY?.trim());
}

function fromAddress(): string {
	return process.env.EMAIL_FROM?.trim() || "Otto <onboarding@resend.dev>";
}

export async function sendEmail(params: {
	to: string;
	subject: string;
	html: string;
}): Promise<void> {
	if (!isConfigured()) {
		logger.warn(
			{ to: params.to, subject: params.subject },
			"RESEND_API_KEY not set — email not sent",
		);
		return;
	}
	const response = await fetch(RESEND_API_URL, {
		method: "POST",
		headers: {
			authorization: `Bearer ${process.env.RESEND_API_KEY?.trim()}`,
			"content-type": "application/json",
		},
		body: JSON.stringify({
			from: fromAddress(),
			to: params.to,
			subject: params.subject,
			html: params.html,
		}),
	});
	if (!response.ok) {
		const detail = await response.text().catch(() => "");
		logger.error(
			{ status: response.status, detail: detail.slice(0, 300) },
			"Resend send failed",
		);
	}
}

export function verificationEmailHtml(url: string): string {
	return `<p>Confirm your email to finish setting up your Otto workspace.</p><p><a href="${url}">Verify your email</a></p><p>If you didn't create an Otto account, you can ignore this email.</p>`;
}

export function resetPasswordEmailHtml(url: string): string {
	return `<p>Someone asked to reset the password for your Otto account.</p><p><a href="${url}">Reset your password</a></p><p>If you didn't request this, you can ignore this email — your password won't change.</p>`;
}
