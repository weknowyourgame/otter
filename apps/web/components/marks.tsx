export function OttoGlyph({ className = "h-4 w-4" }: { className?: string }) {
	return (
		<svg
			aria-label="Otto otter mark"
			className={className}
			fill="none"
			role="img"
			viewBox="0 0 24 24"
		>
			<path
				d="M7.4 8.4c1.5-1.7 3.3-2.6 5.3-2.6 1.8 0 3.4.6 4.8 1.8l2.2.1-.4 2.5H6.3l1.1-1.8Z"
				fill="currentColor"
			/>
			<path
				d="M6.4 14.3c0-3.1 2.4-5.2 5.6-5.2s5.6 2.1 5.6 5.2c0 3.4-2.2 5.8-5.6 5.8s-5.6-2.4-5.6-5.8Z"
				stroke="currentColor"
				strokeLinejoin="round"
				strokeWidth="1.7"
			/>
			<path
				d="M6.8 13.2 4.5 11.4m12.7 1.8 2.3-1.8"
				stroke="currentColor"
				strokeLinecap="round"
				strokeWidth="1.5"
			/>
			<path
				d="M10 13.5h.01M14 13.5h.01"
				stroke="currentColor"
				strokeLinecap="round"
				strokeWidth="2"
			/>
			<path
				d="M10.1 16.5c1.2.8 2.6.8 3.8 0"
				stroke="currentColor"
				strokeLinecap="round"
				strokeWidth="1.4"
			/>
		</svg>
	);
}

export function OtterMascot({
	className = "h-16 w-16",
}: {
	className?: string;
}) {
	return (
		<svg
			aria-label="Otto otter mascot"
			className={className}
			role="img"
			viewBox="0 0 96 96"
		>
			<path
				className="od-otter-mascot__fur"
				d="M24 51c0-8 3.9-15 10.2-19.4 3.5-2.5 8.1-3.8 13.8-3.8s10.3 1.3 13.8 3.8C68.1 36 72 43 72 51c0 14.8-9.3 25-24 25S24 65.8 24 51Z"
			/>
			<path
				className="od-otter-mascot__ear"
				d="M27.5 42.5c-6.4-1-9.8 2.1-9.8 6.6 0 3.9 2.7 6.7 6.8 6.8M68.5 42.5c6.4-1 9.8 2.1 9.8 6.6 0 3.9-2.7 6.7-6.8 6.8"
			/>
			<path
				className="od-otter-mascot__cap"
				d="M29.5 31.4c5.3-6.4 11.7-9.6 19.2-9.6 6.3 0 12.2 2.4 17.8 7.1l8 .4-1.8 9.1H26.2l3.3-7Z"
			/>
			<path className="od-otter-mascot__brim" d="M25.7 38.4h49.5" />
			<path
				className="od-otter-mascot__muzzle"
				d="M36.5 56.8c0-5.4 4.7-9.1 11.5-9.1s11.5 3.7 11.5 9.1c0 6.8-4.4 11.4-11.5 11.4s-11.5-4.6-11.5-11.4Z"
			/>
			<path className="od-otter-mascot__eye" d="M38 48.4h.01M58 48.4h.01" />
			<path
				className="od-otter-mascot__nose"
				d="M44.3 56.2c2.3 1.6 5.1 1.6 7.4 0"
			/>
			<path
				className="od-otter-mascot__whisker"
				d="M34.2 57.8h-8.4M35.2 62.4l-7.1 3.1M61.8 57.8h8.4M60.8 62.4l7.1 3.1"
			/>
		</svg>
	);
}

export function OttoWordmark({ dark = true }: { dark?: boolean }) {
	return (
		<span className="inline-flex items-center gap-2.5">
			<span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-accent to-[#3d47c9] shadow-[0_2px_10px_rgba(91,108,249,0.45)]">
				<OttoGlyph className="h-3.5 w-3.5 text-white" />
			</span>
			<span
				className={`text-[17px] font-semibold tracking-tight ${dark ? "text-white" : "text-zinc-900"}`}
			>
				Otto
			</span>
		</span>
	);
}
