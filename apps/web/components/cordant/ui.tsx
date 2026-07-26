"use client";

// Shared chrome for Cordant, the demo ops console. Light theme on purpose —
// the dark Otter widget reads as a distinct product layered on top of it.

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

export function PageHeader({
	title,
	sub,
	crumbs,
	actions,
}: {
	title: string;
	sub?: string;
	crumbs?: Array<{ label: string; href?: string }>;
	actions?: ReactNode;
}) {
	return (
		<div className="mb-7">
			{crumbs && <Breadcrumbs items={crumbs} />}
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-xl font-semibold tracking-tight text-zinc-900">{title}</h1>
					{sub && <p className="mt-1 text-[13.5px] text-zinc-500">{sub}</p>}
				</div>
				{actions && <div className="flex flex-none items-center gap-2">{actions}</div>}
			</div>
		</div>
	);
}

export function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
	return (
		<div className="mb-2.5 flex items-center gap-1.5 text-[12px] text-zinc-400">
			{items.map((item, i) => (
				<span key={item.label} className="flex items-center gap-1.5">
					{i > 0 && <span className="text-zinc-300">/</span>}
					{item.href ? (
						<Link href={item.href} className="transition hover:text-zinc-700">
							{item.label}
						</Link>
					) : (
						<span className="font-medium text-zinc-600">{item.label}</span>
					)}
				</span>
			))}
		</div>
	);
}

export function Panel({
	title,
	sub,
	children,
	footer,
	dense,
}: {
	title?: string;
	sub?: string;
	children: ReactNode;
	footer?: ReactNode;
	dense?: boolean;
}) {
	return (
		<section className="mb-6 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(16,17,20,0.04)]">
			{title && (
				<div className="border-b border-zinc-100 px-6 py-4">
					<h2 className="text-[14.5px] font-semibold text-zinc-900">{title}</h2>
					{sub && <p className="mt-0.5 text-[12.5px] text-zinc-500">{sub}</p>}
				</div>
			)}
			<div className={dense ? "" : "px-6 py-5"}>{children}</div>
			{footer && <div className="border-t border-zinc-100 bg-zinc-50/60 px-6 py-3.5">{footer}</div>}
		</section>
	);
}

export function Row({ label, sub, children }: { label: string; sub?: string; children: ReactNode }) {
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
	size = "md",
	...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: "primary" | "secondary" | "danger" | "ghost";
	size?: "sm" | "md";
}) {
	const styles = {
		primary: "bg-zinc-900 text-white hover:bg-zinc-700",
		secondary: "border border-zinc-300 text-zinc-700 hover:bg-zinc-50",
		danger: "border border-red-200 text-red-600 hover:bg-red-50",
		ghost: "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800",
	}[variant];
	const pad = size === "sm" ? "px-2.5 py-1.5 text-[12px]" : "px-3.5 py-2 text-[13px]";
	return (
		<button
			type="button"
			{...props}
			className={`rounded-lg font-semibold transition disabled:opacity-40 ${pad} ${styles} ${props.className ?? ""}`}
		>
			{children}
		</button>
	);
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={label}
			onClick={() => onChange(!checked)}
			className={`relative h-6 rounded-full transition-colors duration-200 ${checked ? "bg-emerald-500" : "bg-zinc-300"}`}
			style={{ width: 42 }}
		>
			<span
				className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? "translate-x-[19px]" : "translate-x-0.5"}`}
			/>
		</button>
	);
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
	return (
		<button
			type="button"
			role="checkbox"
			aria-checked={checked}
			aria-label={label}
			onClick={() => onChange(!checked)}
			className={`grid h-[18px] w-[18px] flex-none place-items-center rounded-[5px] border transition ${
				checked ? "border-indigo-600 bg-indigo-600" : "border-zinc-300 bg-white hover:border-zinc-400"
			}`}
		>
			{checked && (
				<svg viewBox="0 0 24 24" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
					<path d="M5 12.5l4.5 4.5L19 7.5" />
				</svg>
			)}
		</button>
	);
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
	return (
		<input
			{...props}
			className={`w-full rounded-lg border border-zinc-300 px-3.5 py-2 text-[13.5px] text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 ${props.className ?? ""}`}
		/>
	);
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
	return (
		<textarea
			{...props}
			className={`w-full rounded-lg border border-zinc-300 px-3.5 py-2 text-[13.5px] text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 ${props.className ?? ""}`}
		/>
	);
}

export function Select({
	value,
	onChange,
	options,
	"aria-label": ariaLabel,
	className,
}: {
	value: string;
	onChange: (v: string) => void;
	options: string[];
	"aria-label": string;
	className?: string;
}) {
	return (
		<select
			aria-label={ariaLabel}
			value={value}
			onChange={(e) => onChange(e.target.value)}
			className={`rounded-lg border border-zinc-300 px-3 py-2 text-[13px] text-zinc-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 ${className ?? ""}`}
		>
			{options.map((o) => (
				<option key={o}>{o}</option>
			))}
		</select>
	);
}

export type BadgeTone = "zinc" | "green" | "amber" | "red" | "blue" | "violet";

export function Badge({ children, tone = "zinc" }: { children: ReactNode; tone?: BadgeTone }) {
	const tones = {
		zinc: "bg-zinc-100 text-zinc-600",
		green: "bg-emerald-50 text-emerald-700",
		amber: "bg-amber-50 text-amber-700",
		red: "bg-red-50 text-red-600",
		blue: "bg-blue-50 text-blue-700",
		violet: "bg-violet-50 text-violet-700",
	}[tone];
	return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tones}`}>{children}</span>;
}

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
	const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
	return (
		<span
			className="grid flex-none place-items-center rounded-full bg-gradient-to-br from-zinc-400 to-zinc-600 font-bold text-white"
			style={{ width: size, height: size, fontSize: size * 0.4 }}
		>
			{initials}
		</span>
	);
}

// ---------- Tabs ----------

export function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
	return (
		<div className="mb-5 flex gap-1 border-b border-zinc-200">
			{tabs.map((t) => (
				<button
					key={t}
					type="button"
					onClick={() => onChange(t)}
					className={`-mb-px border-b-2 px-3.5 py-2.5 text-[13px] font-medium transition ${
						active === t ? "border-indigo-600 text-indigo-700" : "border-transparent text-zinc-500 hover:text-zinc-800"
					}`}
				>
					{t}
				</button>
			))}
		</div>
	);
}

// ---------- Dropdown menu (kebab) ----------

export function Menu({ trigger, items }: { trigger: ReactNode; items: Array<{ label: string; onClick: () => void; danger?: boolean }> }) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const onClick = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
		};
		document.addEventListener("mousedown", onClick);
		return () => document.removeEventListener("mousedown", onClick);
	}, [open]);

	return (
		<div className="relative" ref={ref}>
			<button
				type="button"
				aria-label="Open menu"
				onClick={() => setOpen((v) => !v)}
				className="grid h-7 w-7 place-items-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
			>
				{trigger}
			</button>
			{open && (
				<div className="absolute right-0 top-8 z-20 w-44 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
					{items.map((item) => (
						<button
							key={item.label}
							type="button"
							onClick={() => {
								setOpen(false);
								item.onClick();
							}}
							className={`block w-full px-3 py-2 text-left text-[12.5px] font-medium transition ${
								item.danger ? "text-red-600 hover:bg-red-50" : "text-zinc-700 hover:bg-zinc-50"
							}`}
						>
							{item.label}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

export function KebabIcon() {
	return (
		<svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
			<circle cx="12" cy="5" r="1.6" />
			<circle cx="12" cy="12" r="1.6" />
			<circle cx="12" cy="19" r="1.6" />
		</svg>
	);
}

// ---------- Combobox (searchable single-select) ----------

export function Combobox({
	value,
	onChange,
	options,
	placeholder,
	"aria-label": ariaLabel,
}: {
	value: string | null;
	onChange: (v: string | null) => void;
	options: string[];
	placeholder: string;
	"aria-label": string;
}) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const onClick = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
		};
		document.addEventListener("mousedown", onClick);
		return () => document.removeEventListener("mousedown", onClick);
	}, [open]);

	const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));

	return (
		<div className="relative" ref={ref}>
			<button
				type="button"
				aria-label={ariaLabel}
				onClick={() => setOpen((v) => !v)}
				className="flex w-full items-center justify-between gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-left text-[13px] text-zinc-800 outline-none transition hover:border-zinc-400"
			>
				<span className={value ? "" : "text-zinc-400"}>{value ?? placeholder}</span>
				<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" className="flex-none text-zinc-400">
					<path d="M6 9.5l6 6 6-6" />
				</svg>
			</button>
			{open && (
				<div className="absolute left-0 top-[calc(100%+4px)] z-20 w-56 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg">
					<input
						autoFocus
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search…"
						aria-label={`Search ${ariaLabel}`}
						className="w-full border-b border-zinc-100 px-3 py-2 text-[12.5px] outline-none"
					/>
					<div className="max-h-52 overflow-y-auto py-1">
						<button
							type="button"
							onClick={() => {
								onChange(null);
								setOpen(false);
								setQuery("");
							}}
							className="block w-full px-3 py-1.5 text-left text-[12.5px] text-zinc-400 hover:bg-zinc-50"
						>
							Unassigned
						</button>
						{filtered.map((o) => (
							<button
								key={o}
								type="button"
								onClick={() => {
									onChange(o);
									setOpen(false);
									setQuery("");
								}}
								className={`block w-full px-3 py-1.5 text-left text-[12.5px] hover:bg-zinc-50 ${o === value ? "font-semibold text-zinc-900" : "text-zinc-700"}`}
							>
								{o}
							</button>
						))}
						{filtered.length === 0 && <p className="px-3 py-2 text-[12px] text-zinc-400">No matches</p>}
					</div>
				</div>
			)}
		</div>
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
				const inFinder = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
				return on && !inFinder ? <rect key={i} x={x} y={y} width={1} height={1} fill="#18181b" /> : null;
			})}
			{finder(0, 0)}
			{finder(n - 7, 0)}
			{finder(0, n - 7)}
		</svg>
	);
}
