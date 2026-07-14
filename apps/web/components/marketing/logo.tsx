import type { CSSProperties } from "react";

type OttoMarkProps = {
	className?: string;
	animated?: boolean;
	style?: CSSProperties;
};

export function OttoMark({ className = "", animated = true, style }: OttoMarkProps) {
	return (
		<svg
			aria-label="Otto"
			className={`mk-mark ${animated ? "mk-mark-animated" : ""} ${className}`}
			role="img"
			style={style}
			viewBox="0 0 350 286"
		>
			<path d="M0 61 65 0h219l66 61v225H66L0 226V61Z" fill="currentColor" />
			<g className="mk-mark-eyes" fill="var(--mk-eye-color, #080808)">
				<path d="M56 124c0-14 11-25 25-25h47c14 0 25 11 25 25v27h-25v-13c0-8-4-11-13-11H94c-9 0-13 3-13 11v13H56v-27Z" />
				<path d="M182 124c0-14 11-25 25-25h47c14 0 25 11 25 25v27h-25v-13c0-8-4-11-13-11h-21c-9 0-13 3-13 11v13h-25v-27Z" />
			</g>
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
