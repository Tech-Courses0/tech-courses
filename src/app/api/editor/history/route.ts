import { NextResponse } from "next/server";
import { listContentHistory } from "@/lib/site-content";

export async function GET() {
  return NextResponse.json({ history: await listContentHistory(5) });
}
