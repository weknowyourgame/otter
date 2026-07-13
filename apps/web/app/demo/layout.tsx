import type { Metadata } from "next";
import { OttoMount } from "@/components/otto-mount";
import { NimbusShell } from "@/components/nimbus/shell";

export const metadata: Metadata = {
	title: "Nimbus — demo workspace",
	description: "A live demo SaaS with real settings. Ask Otto to change something.",
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-screen bg-paper text-zinc-900">
			<NimbusShell>{children}</NimbusShell>
			<OttoMount />
		</div>
	);
}
