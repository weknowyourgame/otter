"use client";

// Shared chrome for Nimbus, the demo SaaS. Light theme on purpose — the
// dark Otto widget reads as a distinct product layered on top of it.

import type { ReactNode } from "react";

export function PageHeader({ title, sub }: { title: string; sub: string }) {
	return (
		<div className="mb-8">
			<h1 className="text-xl font-semibold tracking-tight text-zinc-900">{title}</h1>
			<p className="mt-1 text-[13.5px] text-zinc-500">{sub}</p>
		</div>
	);
}

export function Panel({
	title,
	sub,
	children,
	footer,
}: {
	title: string;
	sub?: string;
	children: ReactNode;
	footer?: ReactNode;
}) {
	return (
		<section className="mb-6 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(16,17,20,0.04)]">
			<div className="border-b border-zinc-100 px-6 py-4">
				<h2 className="text-[14.5px] font-semibold text-zinc-900">{title}</h2>
				{sub && <p className="mt-0.5 text-[12.5px] text-zinc-500">{sub}</p>}
			</div>
			<div className="px-6 py-5">{children}</div>
			{footer && <div className="border-t border-zinc-100 bg-zinc-50/60 px-6 py-3.5">{footer}</div>}
		</section>
	);
}

export function Row({
	label,
	sub,
	children,
}: {
	label: string;
	sub?: string;
	children: ReactNode;
}) {
	return (
		<div className="flex items-center justify-between gap-6 py-3.5 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-zinc-100">
			<div className="min-w-0">
				<p className="text-[13.5px] font-medium text-zinc-800">{label}</p>
				{sub && <p className="mt-0.5 text-[12.5px] text-zinc-500">{sub}</p>}
			</div>
			<div className="flex-none">{children}</div>
		</div>
	);
}

export function Button({
	children,
	variant = "secondary",
	...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: "primary" | "secondary" | "danger";
}) {
	const styles = {
		primary: "bg-zinc-900 text-white hover:bg-zinc-700",
		secondary: "border border-zinc-300 text-zinc-700 hover:bg-zinc-50",
		danger: "border border-red-200 text-red-600 hover:bg-red-50",
	}[variant];
	return (
		<button
			type="button"
			{...props}
			className={`rounded-lg px-3.5 py-2 text-[13px] font-semibold transition disabled:opacity-40 ${styles} ${props.className ?? ""}`}
		>
			{children}
		</button>
	);
}

export function Toggle({
	checked,
	onChange,
	label,
}: {
	checked: boolean;
	onChange: (v: boolean) => void;
	label: string;
}) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={label}
			onClick={() => onChange(!checked)}
			className={`relative h-6 w-10.5 rounded-full transition-colors duration-200 ${
				checked ? "bg-emerald-500" : "bg-zinc-300"
			}`}
			style={{ width: 42 }}
		>
			<span
				className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
					checked ? "translate-x-[19px]" : "translate-x-0.5"
				}`}
				style={{ left: 0 }}
			/>
		</button>
	);
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
	return (
		<input
			{...props}
			className={`w-full rounded-lg border border-zinc-300 px-3.5 py-2 text-[13.5px] text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 ${props.className ?? ""}`}
		/>
	);
}

export function Badge({
	children,
	tone = "zinc",
}: {
	children: ReactNode;
	tone?: "zinc" | "green" | "amber" | "red" | "blue";
}) {
	const tones = {
		zinc: "bg-zinc-100 text-zinc-600",
		green: "bg-emerald-50 text-emerald-700",
		amber: "bg-amber-50 text-amber-700",
		red: "bg-red-50 text-red-600",
		blue: "bg-blue-50 text-blue-700",
	}[tone];
	return (
		<span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tones}`}>
			{children}
		</span>
	);
}

/** Deterministic QR-looking SVG — a real enrollment screen stand-in. */
export function FakeQR({ seed }: { seed: string }) {
	let h = 2166136261;
	for (let i = 0; i < seed.length; i++) {
		h ^= seed.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	const rand = () => {
		h ^= h << 13;
		h ^= h >>> 17;
		h ^= h << 5;
		return (h >>> 0) / 4294967295;
	};
	const n = 21;
	const cells: boolean[] = [];
	for (let i = 0; i < n * n; i++) cells.push(rand() > 0.52);
	const finder = (cx: number, cy: number) => (
		<g key={`${cx}-${cy}`}>
			<rect x={cx} y={cy} width={7} height={7} fill="#18181b" />
			<rect x={cx + 1} y={cy + 1} width={5} height={5} fill="#fff" />
			<rect x={cx + 2} y={cy + 2} width={3} height={3} fill="#18181b" />
		</g>
	);
	return (
		<svg viewBox={`0 0 ${n} ${n}`} className="h-40 w-40 rounded-lg border border-zinc-200 bg-white p-1.5">
			{cells.map((on, i) => {
				const x = i % n;
				const y = Math.floor(i / n);
				const inFinder =
					(x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
				return on && !inFinder ? (
					<rect key={i} x={x} y={y} width={1} height={1} fill="#18181b" />
				) : null;
			})}
			{finder(0, 0)}
			{finder(n - 7, 0)}
			{finder(0, n - 7)}
		</svg>
	);
}
