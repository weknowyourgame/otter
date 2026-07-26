export interface OtterUser {
	email?: string;
	name?: string;
}

export interface OtterConfig {
	endpoint?: string;
	publicKey?: string;
	wsEndpoint?: string;
	name?: string;
	accent?: string;
	theme?: "dark" | "light" | "auto";
	position?: "bottom-right" | "bottom-left";
	user?: OtterUser;
	maxSteps?: number;
	zIndex?: number;
	riskyWords?: string[];
	hideBranding?: boolean;
}

export interface OtterInstance {
	open(): void;
	close(): void;
	ask(message: string): void;
	destroy(): void;
}

export declare function init(userConfig?: OtterConfig): OtterInstance;
