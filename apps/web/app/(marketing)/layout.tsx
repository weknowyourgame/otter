import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
	subsets: ["latin"],
	variable: "--font-inter",
	display: "swap",
});

export const metadata: Metadata = {
	title: "Otto | Support that gets the task done",
	description:
		"Otto is an embeddable AI support agent that helps customers complete tasks inside your product.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className={inter.variable}>
			<body>{children}</body>
		</html>
	);
}
