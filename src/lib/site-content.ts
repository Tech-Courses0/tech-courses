import "server-only";
import { deepMerge } from "@/lib/object-path";
import { defaultContent } from "@/lib/content-defaults";
import type { PrismaClient } from "@prisma/client";
import type { SiteContent } from "@/types/content";

export { defaultContent };

// ── Persistence (Prisma; Postgres via @prisma/adapter-pg) ──
//
// The prisma client throws at import time when DATABASE_URL is unset, so it's
// imported dynamically and only after a DATABASE_URL guard — this keeps the
// whole site rendering from defaultContent() with zero DB config. Writes throw
// a clear error in that case.

async function db(): Promise<PrismaClient | null> {
  if (!process.env.DATABASE_URL) return null;
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

const CONTENT_READ_TIMEOUT_MS = 2_000;

/**
 * Public pages must still render when the optional content database is offline.
 * Prisma's connection attempt can otherwise wait long enough to leave a route
 * appearing to load forever in local development.
 */
async function withReadTimeout<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Content database read timed out after ${CONTENT_READ_TIMEOUT_MS}ms.`)),
          CONTENT_READ_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function readRow(id: "draft" | "live"): Promise<SiteContent | null> {
  const prisma = await db();
  if (!prisma) return null;
  try {
    const row = await withReadTimeout(prisma.siteContent.findUnique({ where: { id } }));
    const stored = row?.data as Partial<SiteContent> | undefined;
    if (!stored) return null;
    // Overlay stored values on current defaults so a row written before a
    // schema field existed still renders (missing keys fall back; arrays
    // replace wholesale so deletes/reorders stick). See object-path.deepMerge.
    return deepMerge(defaultContent(), stored);
  } catch (err) {
    // Table not migrated yet, or a transient DB error — fall back to defaults so
    // the public site always renders (reads are best-effort; writes still throw).
    console.error(`site_content read (${id}) failed, using defaults:`, err);
    return null;
  }
}

async function writeRow(id: "draft" | "live", data: SiteContent): Promise<void> {
  const prisma = await db();
  if (!prisma) throw new Error("DATABASE_URL not configured — cannot save content.");
  await prisma.siteContent.upsert({
    where: { id },
    create: { id, data: data as object },
    update: { data: data as object },
  });
}

/** Public site reads this on every request (one JSONB row — cheap). */
export async function getLiveContent(): Promise<SiteContent> {
  return (await readRow("live")) ?? defaultContent();
}

/** Editor reads/writes this. Falls back to live, then defaults. */
export async function getDraftContent(): Promise<SiteContent> {
  return (await readRow("draft")) ?? (await readRow("live")) ?? defaultContent();
}

export async function saveDraftContent(content: SiteContent): Promise<void> {
  await writeRow("draft", content);
}

/** Copies draft → live and records the version in history (History panel). */
export async function publishContent(message: string): Promise<void> {
  const draft = await getDraftContent();
  await writeRow("live", draft);
  const prisma = await db();
  if (prisma) {
    try {
      await prisma.siteContentHistory.create({
        data: { message, data: draft as object },
      });
    } catch (err) {
      console.error("Failed to record content history:", err);
    }
  }
}

export interface ContentHistoryEntry {
  id: number;
  message: string;
  createdAt: string;
}

/** Most recent published versions, newest first — the History panel. */
export async function listContentHistory(limit = 5): Promise<ContentHistoryEntry[]> {
  const prisma = await db();
  if (!prisma) return [];
  const rows = await prisma.siteContentHistory.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    message: r.message,
    createdAt: r.createdAt.toISOString(),
  }));
}

/** Loads a past published version back into the draft for review — not live
 *  again until the owner hits Publish. */
export async function revertToHistory(id: number): Promise<void> {
  const prisma = await db();
  if (!prisma) throw new Error("DATABASE_URL not configured — cannot revert.");
  const row = await prisma.siteContentHistory.findUnique({ where: { id } });
  const stored = row?.data as Partial<SiteContent> | undefined;
  if (!stored) throw new Error("That version no longer exists.");
  await writeRow("draft", deepMerge(defaultContent(), stored));
}

/** Wipes every edit ever made — draft and live both reset to the original
 *  launch content, live immediately. Still recorded in history so it too is
 *  reversible. */
export async function revertToOriginal(): Promise<void> {
  const original = defaultContent();
  await writeRow("draft", original);
  await writeRow("live", original);
  const prisma = await db();
  if (prisma) {
    try {
      await prisma.siteContentHistory.create({
        data: { message: "Reverted to original", data: original as object },
      });
    } catch (err) {
      console.error("Failed to record content history:", err);
    }
  }
}
