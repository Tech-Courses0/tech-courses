import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "ca_admin";
const PUBLIC_API_PATHS = ["/api/editor/login", "/api/editor/logout"];

/**
 * Gates the visual editor and its API routes behind a single shared secret —
 * this site has one owner for the CMS and no user table for it, so the
 * EDITOR_SECRET cookie is the whole auth model. Deliberately scoped to
 * `/api/editor/*` (NOT `/api/admin/*`) so it never touches the existing
 * `/api/admin/sync` route, which uses the site's own admin (tc_session) auth.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isEditor = pathname.startsWith("/admin/editor");
  const isProtectedApi =
    pathname.startsWith("/api/editor/") && !PUBLIC_API_PATHS.some((p) => pathname.startsWith(p));

  if (!isEditor && !isProtectedApi) return NextResponse.next();

  const secret = process.env.EDITOR_SECRET;
  const cookie = req.cookies.get(COOKIE)?.value;
  if (secret && cookie === secret) return NextResponse.next();

  if (isProtectedApi) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/admin/login", req.url));
}

export const config = {
  matcher: ["/admin/editor/:path*", "/api/editor/:path*"],
};
