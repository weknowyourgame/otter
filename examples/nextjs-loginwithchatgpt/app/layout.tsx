import type { ReactNode } from "react";
import { AIWidgetMount } from "@/components/ai-widget-mount";
import "./globals.css";

export const metadata = {
	title: "loginwithchatgpt (example)",
	description: "ai-widget-sdk example, mirroring the real loginwithchatgpt site's structure.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<body>
				{children}
				<AIWidgetMount />
			</body>
		</html>
	);
}
