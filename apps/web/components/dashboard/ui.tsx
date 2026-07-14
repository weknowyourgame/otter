"use client";

import { Check, Copy, X } from "lucide-react";
import type {
	ButtonHTMLAttributes,
	InputHTMLAttributes,
	ReactNode,
	SelectHTMLAttributes,
	TextareaHTMLAttributes,
} from "react";
import { useEffect, useState } from "react";

export function cx(...values: Array<string | false | null | undefined>) {
	return values.filter(Boolean).join(" ");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: "primary" | "secondary" | "ghost" | "danger";
	size?: "sm" | "md" | "icon";
};

export function Button({
	className,
	variant = "secondary",
	size = "md",
	...props
}: ButtonProps) {
	return (
		<button
			className={cx(
				"od-button",
				`od-button--${variant}`,
				`od-button--${size}`,
				className,
			)}
			{...props}
		/>
	);
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
	label: string;
	hint?: string;
	action?: ReactNode;
};

export function Field({
	label,
	hint,
	action,
	className,
	id,
	...props
}: FieldProps) {
	const inputId = id ?? label.toLowerCase().replaceAll(" ", "-");
	return (
		<label className="od-field" htmlFor={inputId}>
			<span className="od-field__head">
				<span className="od-field__label">{label}</span>
				{action}
			</span>
			<input className={cx("od-input", className)} id={inputId} {...props} />
			{hint ? <span className="od-field__hint">{hint}</span> : null}
		</label>
	);
}

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
	label: string;
	hint?: string;
};

export function TextAreaField({
	label,
	hint,
	className,
	id,
	...props
}: TextAreaFieldProps) {
	const inputId = id ?? label.toLowerCase().replaceAll(" ", "-");
	return (
		<label className="od-field" htmlFor={inputId}>
			<span className="od-field__label">{label}</span>
			<textarea
				className={cx("od-input", "od-textarea", className)}
				id={inputId}
				{...props}
			/>
			{hint ? <span className="od-field__hint">{hint}</span> : null}
		</label>
	);
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
	label: string;
	hint?: string;
	children: ReactNode;
};

export function SelectField({
	label,
	hint,
	className,
	id,
	children,
	...props
}: SelectFieldProps) {
	const inputId = id ?? label.toLowerCase().replaceAll(" ", "-");
	return (
		<label className="od-field" htmlFor={inputId}>
			<span className="od-field__label">{label}</span>
			<select
				className={cx("od-input", "od-select", className)}
				id={inputId}
				{...props}
			>
				{children}
			</select>
			{hint ? <span className="od-field__hint">{hint}</span> : null}
		</label>
	);
}

export function Toggle({
	checked,
	onChange,
	disabled,
	label,
}: {
	checked: boolean;
	onChange: (checked: boolean) => void;
	disabled?: boolean;
	label: string;
}) {
	return (
		<button
			aria-label={label}
			aria-pressed={checked}
			className={cx("od-toggle", checked && "is-on")}
			disabled={disabled}
			onClick={() => onChange(!checked)}
			type="button"
		>
			<span />
		</button>
	);
}

export function SettingToggle({
	title,
	description,
	checked,
	onChange,
}: {
	title: string;
	description: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
}) {
	return (
		<div className="od-setting-toggle">
			<div>
				<strong>{title}</strong>
				<p>{description}</p>
			</div>
			<Toggle checked={checked} label={title} onChange={onChange} />
		</div>
	);
}

export function SettingsSection({
	title,
	description,
	children,
	className,
	danger,
}: {
	title: string;
	description?: string;
	children: ReactNode;
	className?: string;
	danger?: boolean;
}) {
	return (
		<section
			className={cx("od-settings-section", danger && "is-danger", className)}
		>
			<div className="od-section-copy">
				<h2>{title}</h2>
				{description ? <p>{description}</p> : null}
			</div>
			<div className="od-panel">{children}</div>
		</section>
	);
}

export function PanelFooter({ children }: { children: ReactNode }) {
	return <div className="od-panel-footer">{children}</div>;
}

export function Meter({
	label,
	value,
	limit,
	tone = "neutral",
}: {
	label: string;
	value: number;
	limit: number;
	tone?: "neutral" | "orange" | "blue";
}) {
	const percentage = Math.min(100, Math.max(0, (value / limit) * 100));
	return (
		<div className={cx("od-meter", `od-meter--${tone}`)}>
			<div className="od-meter__copy">
				<span>{label}</span>
				<span>
					{value.toLocaleString()} / {limit.toLocaleString()}
				</span>
			</div>
			<div className="od-meter__track">
				<span style={{ width: `${percentage}%` }} />
			</div>
		</div>
	);
}

export function SegmentedMeter({
	segments = 42,
	filled = 0,
}: {
	segments?: number;
	filled?: number;
}) {
	return (
		<div className="od-segmented-meter" aria-hidden>
			{Array.from({ length: segments }, (_, index) => index + 1).map(
				(segment) => (
					<span
						className={segment <= filled ? "is-filled" : ""}
						key={`meter-segment-${segment}`}
					/>
				),
			)}
		</div>
	);
}

export function CopyButton({
	value,
	label = "Copy",
}: {
	value: string;
	label?: string;
}) {
	const [copied, setCopied] = useState(false);
	return (
		<Button
			aria-label={label}
			onClick={async () => {
				await navigator.clipboard?.writeText(value);
				setCopied(true);
				window.setTimeout(() => setCopied(false), 1400);
			}}
			size="icon"
			variant="ghost"
		>
			{copied ? <Check size={15} /> : <Copy size={15} />}
		</Button>
	);
}

export function Modal({
	open,
	onClose,
	title,
	description,
	children,
}: {
	open: boolean;
	onClose: () => void;
	title: string;
	description?: string;
	children: ReactNode;
}) {
	useEffect(() => {
		if (!open) return;
		const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose, open]);

	if (!open) return null;
	return (
		<div className="od-modal-backdrop">
			<button
				aria-label="Close modal"
				className="od-modal-scrim"
				onClick={onClose}
				type="button"
			/>
			<div aria-modal="true" className="od-modal" role="dialog">
				<div className="od-modal__header">
					<div>
						<h2>{title}</h2>
						{description ? <p>{description}</p> : null}
					</div>
					<Button
						aria-label="Close"
						onClick={onClose}
						size="icon"
						variant="ghost"
					>
						<X size={17} />
					</Button>
				</div>
				{children}
			</div>
		</div>
	);
}

export function PageTitle({
	children,
	action,
}: {
	children: ReactNode;
	action?: ReactNode;
}) {
	return (
		<div className="od-page-title">
			<h1>{children}</h1>
			{action}
		</div>
	);
}

export function EmptyState({
	icon,
	title,
	description,
	action,
}: {
	icon: ReactNode;
	title: string;
	description: string;
	action?: ReactNode;
}) {
	return (
		<div className="od-empty-state">
			<div className="od-empty-state__icon">{icon}</div>
			<h2>{title}</h2>
			<p>{description}</p>
			{action}
		</div>
	);
}
