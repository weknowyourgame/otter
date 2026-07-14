import type { Metadata } from "next";
import { OttoMount } from "@/components/otto-mount";
import { CordantShell } from "@/components/cordant/shell";

export const metadata: Metadata = {
	title: "Cordant — demo workspace",
	description: "A live enterprise support console with real tickets, projects, automation, and admin settings. Ask Otto to do something.",
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-screen bg-paper text-zinc-900">
			<CordantShell>{children}</CordantShell>
			<OttoMount />
		</div>
	);
}
