import { NextResponse } from "next/server";
import { revertToOriginal } from "@/lib/site-content";

export async function POST() {
  try {
    await revertToOriginal();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Revert failed." },
      { status: 500 },
    );
  }
}
