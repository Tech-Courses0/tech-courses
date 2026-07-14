import { NextResponse } from "next/server";

// POST, not GET: a GET here gets auto-prefetched by Next's <Link>, which would
// silently delete the session cookie the moment the editor renders. State-
// mutating logout must never be a prefetchable GET.
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("ca_admin");
  return res;
}
