import { NextResponse } from "next/server";
import { revertToHistory } from "@/lib/site-content";

export async function POST(req: Request) {
  const { id } = await req.json().catch(() => ({ id: null }));
  if (typeof id !== "number") {
    return NextResponse.json({ error: "Missing version id." }, { status: 400 });
  }
  try {
    await revertToHistory(id);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Revert failed." },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true });
}
