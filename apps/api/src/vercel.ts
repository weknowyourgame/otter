// Vercel (Node runtime) entry. Bundled by scripts/build-vercel.mjs.
import { handle } from "hono/vercel";
import { app } from "./index.js";

const handler = handle(app);
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;
