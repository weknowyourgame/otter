"use client";

export type DemoDashboardSession = {
	id: string;
	title: string;
	state: "active" | "done" | "failed";
	source: "ai" | "local";
	steps: number;
	createdAt: number;
	updatedAt: number;
	events: Array<{
		at: number;
		kind: "user" | "agent" | "step" | "result";
		text: string;
	}>;
};

export type DemoTenantUsage = {
	requests: number;
	totalTokens: number;
	conversations: number;
	teamMembers: number;
};

const MINUTE = 60_000;

export function demoFixturesEnabled(): boolean {
	if (typeof window === "undefined") return false;
	return window.localStorage.getItem("otter-demo-fixtures") === "true";
}

export function demoDashboardSessions(
	now = Date.now(),
): DemoDashboardSession[] {
	return [
		{
			id: "demo-password-reset",
			title: "Password reset completed for Sarah",
			state: "active",
			source: "ai",
			steps: 8,
			createdAt: now - 23 * MINUTE,
			updatedAt: now - 4 * MINUTE,
			events: [
				{
					at: now - 23 * MINUTE,
					kind: "user",
					text: "Help Sarah reset her password.",
				},
				{
					at: now - 18 * MINUTE,
					kind: "step",
					text: "Opened the user profile and verified the account email.",
				},
				{
					at: now - 4 * MINUTE,
					kind: "agent",
					text: "Password reset link sent and confirmed.",
				},
			],
		},
		{
			id: "demo-notifications",
			title: "Notification preference changed to email",
			state: "active",
			source: "ai",
			steps: 6,
			createdAt: now - 18 * MINUTE,
			updatedAt: now - 6 * MINUTE,
			events: [
				{
					at: now - 18 * MINUTE,
					kind: "user",
					text: "Switch notifications to email only.",
				},
				{
					at: now - 11 * MINUTE,
					kind: "step",
					text: "Opened notification settings and changed delivery channel.",
				},
				{
					at: now - 6 * MINUTE,
					kind: "result",
					text: "Notification preference saved.",
				},
			],
		},
		{
			id: "demo-apollo",
			title: "Opened Apollo Launch workspace",
			state: "active",
			source: "ai",
			steps: 3,
			createdAt: now - 14 * MINUTE,
			updatedAt: now - 8 * MINUTE,
			events: [
				{
					at: now - 14 * MINUTE,
					kind: "user",
					text: "Open the Apollo Launch workspace.",
				},
				{
					at: now - 8 * MINUTE,
					kind: "step",
					text: "Navigated to the requested workspace.",
				},
			],
		},
		{
			id: "demo-automation",
			title: "Route urgent billing tickets automation created",
			state: "active",
			source: "ai",
			steps: 11,
			createdAt: now - 11 * MINUTE,
			updatedAt: now - 2 * MINUTE,
			events: [
				{
					at: now - 11 * MINUTE,
					kind: "user",
					text: "Create an automation for urgent billing tickets.",
				},
				{
					at: now - 5 * MINUTE,
					kind: "step",
					text: "Configured trigger, priority condition, and billing label.",
				},
				{
					at: now - 2 * MINUTE,
					kind: "result",
					text: "Automation created and left enabled.",
				},
			],
		},
	];
}

export function withDemoDashboardSessions<T extends DemoDashboardSession>(
	sessions: T[],
): DemoDashboardSession[] | T[] {
	if (!demoFixturesEnabled() || sessions.length > 0) return sessions;
	return demoDashboardSessions();
}

export function withDemoTenantUsage(
	usage: DemoTenantUsage | null,
): DemoTenantUsage | null {
	if (!demoFixturesEnabled()) return usage;
	if (!usage) return demoTenantUsage;
	const hasUsage =
		usage.requests > 0 || usage.totalTokens > 0 || usage.conversations > 0;
	return hasUsage ? usage : demoTenantUsage;
}

export const demoTenantUsage: DemoTenantUsage = {
	requests: 37,
	totalTokens: 84_210,
	conversations: 4,
	teamMembers: 2,
};
