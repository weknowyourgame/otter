import { type NextRequest, NextResponse } from "next/server";
import { GATE_COOKIE, gateToken, safeEqual } from "@/lib/gate";

export async function POST(req: NextRequest) {
	const form = await req.formData();
	const supplied = String(form.get("password") ?? "");
	const rawNext = String(form.get("next") ?? "/demo");
	// Only same-site relative paths.
	const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/demo";
	const expected = process.env.DEMO_PASSWORD;

	if (!expected || !safeEqual(await gateToken(supplied), await gateToken(expected))) {
		const back = new URL("/gate", req.url);
		back.searchParams.set("error", "1");
		if (next !== "/demo") back.searchParams.set("next", next);
		return NextResponse.redirect(back, 303);
	}

	const res = NextResponse.redirect(new URL(next, req.url), 303);
	res.cookies.set(GATE_COOKIE, await gateToken(expected), {
		httpOnly: true,
		secure: true,
		sameSite: "lax",
		path: "/",
		maxAge: 60 * 60 * 24 * 7,
	});
	return res;
}
