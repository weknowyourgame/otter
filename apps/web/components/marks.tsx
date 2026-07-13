export function OttoGlyph({ className = "h-4 w-4" }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
			<path d="M12 2.2c.75 5.05 4.7 9 9.75 9.75-5.05.75-9 4.7-9.75 9.75-.75-5.05-4.7-9-9.75-9.75C7.3 11.2 11.25 7.25 12 2.2z" />
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
