"use client";

import { LoaderCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { OttoGlyph } from "@/components/marks";
import { authClient } from "@/lib/auth-client";

const PUBLIC_PATHS = new Set(["/login"]);

export function AuthBoundary({ children }: { children: ReactNode }) {
	const pathname = usePathname();
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();
	const isPublic =
		PUBLIC_PATHS.has(pathname) ||
		pathname.startsWith("/demo") ||
		pathname.startsWith("/invite");

	useEffect(() => {
		if (!isPublic && !isPending && !session) {
			const next = encodeURIComponent(pathname);
			router.replace(`/login?next=${next}`);
		}
	}, [isPending, isPublic, pathname, router, session]);

	if (isPublic) return children;
	if (isPending || !session) {
		return (
			<output className="od-auth-loading">
				<span className="od-auth-loading__mark">
					<OttoGlyph className="h-5 w-5" />
				</span>
				<LoaderCircle aria-hidden className="od-auth-spinner" size={18} />
				<span className="sr-only">Checking your Otto session</span>
			</output>
		);
	}

	return children;
}
