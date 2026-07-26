import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const dashboardSans = IBM_Plex_Sans({
	subsets: ["latin"],
	weight: ["400", "500", "600"],
	variable: "--font-dashboard-face",
	display: "swap",
});

const dashboardMono = IBM_Plex_Mono({
	subsets: ["latin"],
	weight: ["400", "500", "600"],
	variable: "--font-dashboard-mono-face",
	display: "swap",
});

export const metadata: Metadata = {
	title: "Cordant Demo",
	description: "A standalone Cordant demo workspace for showing Otter in-app.",
};

export default function DemoRootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html
			lang="en"
			className={`${dashboardSans.variable} ${dashboardMono.variable}`}
		>
			<body>{children}</body>
		</html>
	);
}
