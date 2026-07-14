import { NextRequest, NextResponse } from "next/server";
import { getDraftContent, saveDraftContent } from "@/lib/site-content";

export async function GET() {
  return NextResponse.json(await getDraftContent());
}

export async function PATCH(req: NextRequest) {
  try {
    await saveDraftContent(await req.json());
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Save failed." },
      { status: 500 },
    );
  }
}
