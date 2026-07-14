"use server";

import { prisma } from "./prisma";
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  getCurrentUser,
  getUserEnrollments,
  grantEnrollment,
  type SessionUser,
  type ClientEnrollment,
} from "./auth";
import { isAdmin } from "./admin";
import { getCourseById } from "./catalog";

export interface AuthResult {
  ok: boolean;
  error?: string;
  user?: SessionUser;
  enrollments?: ClientEnrollment[];
  isAdmin?: boolean;
}

export async function signUpAction(
  name: string,
  email: string,
  password: string,
): Promise<AuthResult> {
  name = name.trim();
  email = email.trim().toLowerCase();
  if (name.length < 2) return { ok: false, error: "Please enter your name." };
  if (!email.includes("@")) return { ok: false, error: "Please enter a valid email address." };
  if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false, error: "An account with this email already exists." };

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password) },
  });
  await createSession(user.id);
  return {
    ok: true,
    user: { id: user.id, name: user.name, email: user.email },
    enrollments: [],
    isAdmin: await isAdmin(user.email),
  };
}

export async function signInAction(email: string, password: string): Promise<AuthResult> {
  email = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && !user.passwordHash) {
    return { ok: false, error: "This account uses Google sign-in. Continue with Google." };
  }
  if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    return { ok: false, error: "Incorrect email or password." };
  }
  await createSession(user.id);
  return {
    ok: true,
    user: { id: user.id, name: user.name, email: user.email },
    enrollments: await getUserEnrollments(user.id),
    isAdmin: await isAdmin(user.email),
  };
}

export async function signOutAction(): Promise<void> {
  await destroySession();
}

// Free-course enrollment only. Paid courses are enrolled by
// /api/payments/verify after the Razorpay signature checks out — this action
// must never grant access to a course with a price, or checkout is skippable.
export async function enrollAction(courseId: string): Promise<ClientEnrollment | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const course = await getCourseById(courseId);
  if (!course || course.priceInr > 0) return null;

  await grantEnrollment(user.id, courseId);
  return { courseId, enrolledAt: new Date().toISOString(), completedLessonIds: [] };
}

export async function toggleLessonAction(
  courseId: string,
  lessonId: string,
): Promise<{ lessonId: string; completed: boolean } | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const existing = await prisma.progress.findUnique({
    where: { userId_lessonId: { userId: user.id, lessonId } },
  });

  if (existing) {
    await prisma.progress.delete({ where: { id: existing.id } });
    return { lessonId, completed: false };
  }

  await prisma.progress.create({ data: { userId: user.id, courseId, lessonId } });
  return { lessonId, completed: true };
}
