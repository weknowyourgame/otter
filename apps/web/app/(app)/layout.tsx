import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
	subsets: ["latin"],
	variable: "--font-inter",
	display: "swap",
});

export const metadata: Metadata = {
	title: "Otto — Workspace",
	description: "Otto's dashboard and live demo workspace.",
};

// A separate root layout from (marketing) — own <html>, own <body>, own
// globals.css. Nothing here can be affected by edits to the landing page's
// styles, and vice versa. See app/(marketing)/layout.tsx for its sibling.
export default function AppRootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className={inter.variable}>
			<body>{children}</body>
		</html>
	);
}
