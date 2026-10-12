import { type NextRequest, NextResponse } from "next/server";
import { GATE_COOKIE, gateToken, safeEqual } from "./lib/gate";

// Password gate for the whole demo. Fails closed: with no DEMO_PASSWORD set,
// nothing is reachable except the gate page itself.
export async function middleware(req: NextRequest) {
	const { pathname, search } = req.nextUrl;
	if (pathname === "/gate" || pathname === "/api/gate") return NextResponse.next();

	const password = process.env.DEMO_PASSWORD;
	const cookie = req.cookies.get(GATE_COOKIE)?.value;
	if (password && cookie && safeEqual(cookie, await gateToken(password))) {
		const res = NextResponse.next();
		res.headers.set("x-robots-tag", "noindex, nofollow");
		return res;
	}

	const url = req.nextUrl.clone();
	url.pathname = "/gate";
	url.search = "";
	if (pathname !== "/") url.searchParams.set("next", pathname + search);
	return NextResponse.redirect(url);
}

export const config = {
	matcher: ["/((?!favicon.ico|icon.svg).*)"],
};
