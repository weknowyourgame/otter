import type { CSSProperties } from "react";

type OttoMarkProps = {
	className?: string;
	animated?: boolean;
	style?: CSSProperties;
};

export function OttoMark({
	className = "",
	animated = true,
	style,
}: OttoMarkProps) {
	return (
		<MascotSvg
			animated={animated}
			className={`mk-mark ${className}`}
			label="Otto otter mark"
			style={style}
		/>
	);
}

export function OttoMascot({
	className = "",
	animated = true,
	style,
}: OttoMarkProps) {
	return (
		<MascotSvg
			animated={animated}
			className={`mk-mark ${className}`}
			label="Otto otter mascot"
			style={style}
		/>
	);
}

function MascotSvg({
	animated = true,
	className = "",
	label,
	style,
}: OttoMarkProps & { label: string }) {
	return (
		<svg
			aria-label={label}
			className={`${animated ? "mk-mark-animated" : ""} mk-mascot ${className}`}
			role="img"
			style={style}
			viewBox="0 0 96 96"
		>
			<path
				d="M24 51c0-8 3.9-15 10.2-19.4 3.5-2.5 8.1-3.8 13.8-3.8s10.3 1.3 13.8 3.8C68.1 36 72 43 72 51c0 14.8-9.3 25-24 25S24 65.8 24 51Z"
				fill="var(--mk-mascot-fur, #ededed)"
				stroke="var(--mk-mascot-line, #111)"
				strokeLinejoin="round"
				strokeWidth="4"
			/>
			<path
				d="M27.5 42.5c-6.4-1-9.8 2.1-9.8 6.6 0 3.9 2.7 6.7 6.8 6.8M68.5 42.5c6.4-1 9.8 2.1 9.8 6.6 0 3.9-2.7 6.7-6.8 6.8"
				fill="none"
				stroke="var(--mk-mascot-line, #111)"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="3.4"
			/>
			<path
				d="M29.5 31.4c5.3-6.4 11.7-9.6 19.2-9.6 6.3 0 12.2 2.4 17.8 7.1l8 .4-1.8 9.1H26.2l3.3-7Z"
				fill="var(--mk-cap-color, var(--mk-mascot-cap, #69d8c8))"
				stroke="var(--mk-mascot-line, #111)"
				strokeLinejoin="round"
				strokeWidth="4"
			/>
			<path
				d="M25.7 38.4h49.5"
				fill="none"
				stroke="var(--mk-mascot-line, #111)"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="4"
			/>
			<path
				d="M36.5 56.8c0-5.4 4.7-9.1 11.5-9.1s11.5 3.7 11.5 9.1c0 6.8-4.4 11.4-11.5 11.4s-11.5-4.6-11.5-11.4Z"
				fill="var(--mk-mascot-fur, #ededed)"
				stroke="var(--mk-mascot-line, #111)"
				strokeLinejoin="round"
				strokeWidth="4"
			/>
			<g className="mk-mark-eyes mk-mascot-eyes">
				<circle cx="38" cy="48.4" fill="var(--mk-mascot-line, #111)" r="2.75" />
				<circle cx="58" cy="48.4" fill="var(--mk-mascot-line, #111)" r="2.75" />
			</g>
			<g className="mk-mascot-eye-closed">
				<path
					d="M35.7 48.4h4.6M55.7 48.4h4.6"
					fill="none"
					stroke="var(--mk-mascot-line, #111)"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="3.2"
				/>
			</g>
			<path
				d="M44.3 56.2c2.3 1.6 5.1 1.6 7.4 0"
				fill="none"
				stroke="var(--mk-mascot-line, #111)"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="3.2"
			/>
			<path
				d="M34.2 57.8h-8.4M35.2 62.4l-7.1 3.1M61.8 57.8h8.4M60.8 62.4l7.1 3.1"
				fill="none"
				stroke="var(--mk-mascot-line, #111)"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="3.4"
			/>
		</svg>
	);
}

export function OttoWordmark() {
	return (
		<span className="mk-wordmark">
			<OttoMark />
			<span>otto</span>
		</span>
	);
}
