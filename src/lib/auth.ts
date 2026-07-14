import "server-only";
import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const scryptAsync = promisify(scrypt);

const COOKIE = "tc_session";
const SESSION_DAYS = 30;

// ---- Password hashing (scrypt, salted) ----

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const keyBuf = Buffer.from(key, "hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return keyBuf.length === derived.length && timingSafeEqual(keyBuf, derived);
}

// ---- Sessions ----

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { token, userId, expiresAt } });

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
    store.delete(COOKIE);
  }
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

// Find-or-create a user from a verified OAuth profile, then start a session.
export async function loginWithOAuth(profile: {
  email: string;
  name: string;
  image?: string;
}): Promise<void> {
  const email = profile.email.trim().toLowerCase();
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name: profile.name || email.split("@")[0], image: profile.image },
    update: { image: profile.image ?? undefined },
  });
  await createSession(user.id);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;

  return { id: session.user.id, name: session.user.name, email: session.user.email };
}

export async function grantEnrollment(userId: string, courseId: string): Promise<void> {
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: { userId, courseId },
    update: {},
  });
}

// ---- Enrollment + progress, shaped for the client store ----

export interface ClientEnrollment {
  courseId: string;
  enrolledAt: string;
  completedLessonIds: string[];
}

export async function getUserEnrollments(userId: string): Promise<ClientEnrollment[]> {
  const [enrollments, progress] = await Promise.all([
    prisma.enrollment.findMany({ where: { userId }, orderBy: { enrolledAt: "asc" } }),
    prisma.progress.findMany({ where: { userId } }),
  ]);

  const doneByCourse = new Map<string, string[]>();
  for (const p of progress) {
    const arr = doneByCourse.get(p.courseId) ?? [];
    arr.push(p.lessonId);
    doneByCourse.set(p.courseId, arr);
  }

  return enrollments.map((e: (typeof enrollments)[number]) => ({
    courseId: e.courseId,
    enrolledAt: e.enrolledAt.toISOString(),
    completedLessonIds: doneByCourse.get(e.courseId) ?? [],
  }));
}
