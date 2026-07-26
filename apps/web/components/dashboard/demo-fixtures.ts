"use client";

export type DemoDashboardSession = {
	id: string;
	title: string;
	state: "active" | "done" | "failed";
	source: "ai" | "local";
	steps: number;
	createdAt: number;
	updatedAt: number;
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
		},
		{
			id: "demo-notifications",
			title: "Notification preference changed to email",
			state: "active",
			source: "ai",
			steps: 6,
			createdAt: now - 18 * MINUTE,
			updatedAt: now - 6 * MINUTE,
		},
		{
			id: "demo-apollo",
			title: "Opened Apollo Launch workspace",
			state: "active",
			source: "ai",
			steps: 3,
			createdAt: now - 14 * MINUTE,
			updatedAt: now - 8 * MINUTE,
		},
		{
			id: "demo-automation",
			title: "Route urgent billing tickets automation created",
			state: "active",
			source: "ai",
			steps: 11,
			createdAt: now - 11 * MINUTE,
			updatedAt: now - 2 * MINUTE,
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
