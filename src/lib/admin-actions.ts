"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { getAdminUser, isBootstrapAdmin } from "./admin";
import { runSync } from "./sync";
import { getVideoById } from "./youtube";

export interface CoursePatch {
  published?: boolean;
  track?: string;
  order?: number;
  code?: string | null;
  priceInr?: number;
  mrpInr?: number;
  titleOverride?: string | null;
  descOverride?: string | null;
  examInfo?: string | null;
  mockTestUrl?: string | null;
}

export async function updateCourseAction(id: string, patch: CoursePatch) {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: "Not authorized" };
  if (patch.priceInr !== undefined && (patch.priceInr < 0 || !Number.isFinite(patch.priceInr))) {
    return { ok: false, error: "Price must be a positive number." };
  }
  if (patch.mrpInr !== undefined && (patch.mrpInr < 0 || !Number.isFinite(patch.mrpInr))) {
    return { ok: false, error: "MRP must be a positive number." };
  }
  await prisma.course.update({ where: { id }, data: patch });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function syncNowAction() {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: "Not authorized" };
  try {
    const result = await runSync();
    revalidatePath("/", "layout");
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Sync failed" };
  }
}

export async function addAdminAction(email: string) {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: "Not authorized" };
  email = email.trim().toLowerCase();
  if (!email.includes("@")) return { ok: false, error: "Enter a valid email address." };
  if (isBootstrapAdmin(email)) return { ok: false, error: "That email is already an owner admin." };
  await prisma.admin.upsert({
    where: { email },
    create: { email, addedBy: admin.email },
    update: {},
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeAdminAction(email: string) {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: "Not authorized" };
  email = email.trim().toLowerCase();
  if (isBootstrapAdmin(email)) return { ok: false, error: "Owner admins can't be removed here." };
  await prisma.admin.deleteMany({ where: { email } });
  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Lesson management ──

export interface LessonPatch {
  titleOverride?: string | null;
  position?: number;
}

export async function updateLessonAction(id: string, patch: LessonPatch) {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: "Not authorized" };
  await prisma.lesson.update({ where: { id }, data: patch });
  revalidatePath("/", "layout");
  return { ok: true };
}

function extractVideoId(input: string): string | null {
  input = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  try {
    const url = new URL(input);
    if (url.hostname.includes("youtube.com")) return url.searchParams.get("v");
    if (url.hostname === "youtu.be") return url.pathname.slice(1).split("?")[0] || null;
  } catch {}
  return null;
}

export async function addLessonAction(courseId: string, youtubeInput: string) {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: "Not authorized" };

  const videoId = extractVideoId(youtubeInput);
  if (!videoId) return { ok: false, error: "Could not extract a YouTube video ID from that input." };

  const existing = await prisma.lesson.findUnique({ where: { id: `${courseId}_${videoId}` } });
  if (existing) return { ok: false, error: "That video is already in this playlist." };

  const video = await getVideoById(videoId);
  if (!video) return { ok: false, error: "Video not found on YouTube." };

  const maxPos = await prisma.lesson.aggregate({ where: { courseId }, _max: { position: true } });
  const position = (maxPos._max.position ?? 0) + 1;

  await prisma.lesson.create({
    data: {
      id: `${courseId}_${videoId}`,
      courseId,
      ytVideoId: videoId,
      title: video.title,
      thumbnail: video.thumbnail,
      seconds: video.seconds,
      views: video.views,
      position,
      manuallyAdded: true,
    },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeLessonAction(id: string) {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: "Not authorized" };
  await prisma.lesson.delete({ where: { id } });
  revalidatePath("/", "layout");
  return { ok: true };
}
