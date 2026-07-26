import type { Metadata } from "next";
import { IBM_Plex_Sans, Manrope } from "next/font/google";
import "./globals.css";

const landingBody = Manrope({
	subsets: ["latin"],
	variable: "--font-landing-body-face",
	display: "swap",
});

const dashboardSans = IBM_Plex_Sans({
	subsets: ["latin"],
	weight: ["400", "500", "600"],
	variable: "--font-dashboard-face",
	display: "swap",
});

export const metadata: Metadata = {
	title: "Otter | Support that gets the task done",
	description:
		"Otter is an embeddable AI support agent that helps customers complete tasks inside your product.",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html
			lang="en"
			className={`${landingBody.variable} ${dashboardSans.variable}`}
		>
			<body>{children}</body>
		</html>
	);
}
