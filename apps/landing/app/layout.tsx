import type { Metadata } from "next";
import { Bricolage_Grotesque, Manrope } from "next/font/google";
import "./globals.css";

const landingDisplay = Bricolage_Grotesque({
	subsets: ["latin"],
	variable: "--font-landing-display-face",
	display: "swap",
});

const landingBody = Manrope({
	subsets: ["latin"],
	variable: "--font-landing-body-face",
	display: "swap",
});

export const metadata: Metadata = {
	title: "Otto | Support that gets the task done",
	description:
		"Otto is an embeddable AI support agent that helps customers complete tasks inside your product.",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html
			lang="en"
			className={`${landingDisplay.variable} ${landingBody.variable}`}
		>
			<body>{children}</body>
		</html>
	);
}
