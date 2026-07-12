import type { ReactNode } from "react";
import { AIWidgetMount } from "@/components/ai-widget-mount";
import { DEMO_USER_EMAIL } from "@/components/demo-user";
import "./globals.css";

export const metadata = {
	title: "loginwithchatgpt (example)",
	description: "ai-widget-sdk example, mirroring the real loginwithchatgpt site's structure.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
	// PASTE YOUR JSM WIDGET SNIPPET HERE (Project settings → Channels → Widget)
	return (
		<html lang="en">
			<body>
				<header
					style={{
						padding: "10px 24px",
						borderBottom: "1px solid #222",
						fontSize: 14,
						background: "#fafafa",
					}}
				>
					Logged in as <strong>{DEMO_USER_EMAIL}</strong>
				</header>
				{children}
				<AIWidgetMount />
			</body>
		</html>
	);
}
