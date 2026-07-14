import { NextRequest, NextResponse } from "next/server";

// In-memory per-instance limiter. Enough to blunt brute force on a single-owner,
// low-traffic site. Move to a shared store if it ever runs across instances.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now > rec.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_ATTEMPTS;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429 },
    );
  }

  const { username, secret } = await req
    .json()
    .catch(() => ({ username: "", secret: "" }));
  const expectedUsername = process.env.EDITOR_USERNAME;
  const expected = process.env.EDITOR_SECRET;

  if (!expectedUsername || !expected || username !== expectedUsername || secret !== expected) {
    return NextResponse.json({ error: "Incorrect username or password" }, { status: 401 });
  }

  attempts.delete(ip);

  const res = NextResponse.json({ ok: true });
  res.cookies.set("ca_admin", expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
