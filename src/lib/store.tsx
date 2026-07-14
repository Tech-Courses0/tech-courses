"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import type { Enrollment } from "./types";
import {
  signInAction,
  signUpAction,
  signOutAction,
  enrollAction,
  toggleLessonAction,
} from "./actions";

/**
 * Application store, backed by the real API/DB (see src/lib/actions.ts).
 * Seeded from the server session in the root layout, with optimistic updates
 * for instant UI. Components only ever talk to this hook.
 */

export interface User {
  name: string;
  email: string;
}

interface StoreState {
  user: User | null;
  enrollments: Enrollment[];
}

export interface AuthOutcome {
  ok: boolean;
  error?: string;
}

interface StoreValue extends StoreState {
  ready: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<AuthOutcome>;
  signUp: (name: string, email: string, password: string) => Promise<AuthOutcome>;
  logout: () => void;
  enroll: (courseId: string) => void;
  confirmEnrollment: (courseId: string) => void;
  isEnrolled: (courseId: string) => boolean;
  toggleLesson: (courseId: string, lessonId: string) => void;
  isLessonComplete: (courseId: string, lessonId: string) => boolean;
  completedCount: (courseId: string) => number;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({
  initialUser,
  initialEnrollments,
  initialIsAdmin = false,
  children,
}: {
  initialUser: User | null;
  initialEnrollments: Enrollment[];
  initialIsAdmin?: boolean;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<StoreState>({
    user: initialUser,
    enrollments: initialEnrollments,
  });
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin);
  const router = useRouter();

  const signIn = useCallback(async (email: string, password: string): Promise<AuthOutcome> => {
    const res = await signInAction(email, password);
    if (res.ok && res.user) {
      setState({ user: { name: res.user.name, email: res.user.email }, enrollments: res.enrollments ?? [] });
      setIsAdmin(Boolean(res.isAdmin));
      router.refresh();
    }
    return { ok: res.ok, error: res.error };
  }, [router]);

  const signUp = useCallback(
    async (name: string, email: string, password: string): Promise<AuthOutcome> => {
      const res = await signUpAction(name, email, password);
      if (res.ok && res.user) {
        setState({ user: { name: res.user.name, email: res.user.email }, enrollments: res.enrollments ?? [] });
        setIsAdmin(Boolean(res.isAdmin));
        router.refresh();
      }
      return { ok: res.ok, error: res.error };
    },
    [router],
  );

  const logout = useCallback(() => {
    setState({ user: null, enrollments: [] });
    setIsAdmin(false);
    void signOutAction().then(() => router.refresh());
  }, [router]);

  const enroll = useCallback((courseId: string) => {
    setState((s) => {
      if (s.enrollments.some((e) => e.courseId === courseId)) return s;
      return {
        ...s,
        enrollments: [
          ...s.enrollments,
          { courseId, enrolledAt: new Date().toISOString(), completedLessonIds: [] },
        ],
      };
    });
    void enrollAction(courseId);
  }, []);

  // Paid courses: enrollment is already persisted server-side by
  // /api/payments/verify. This only syncs local UI state, no server call.
  const confirmEnrollment = useCallback((courseId: string) => {
    setState((s) => {
      if (s.enrollments.some((e) => e.courseId === courseId)) return s;
      return {
        ...s,
        enrollments: [
          ...s.enrollments,
          { courseId, enrolledAt: new Date().toISOString(), completedLessonIds: [] },
        ],
      };
    });
  }, []);

  const toggleLesson = useCallback((courseId: string, lessonId: string) => {
    setState((s) => ({
      ...s,
      enrollments: s.enrollments.map((e) => {
        if (e.courseId !== courseId) return e;
        const has = e.completedLessonIds.includes(lessonId);
        return {
          ...e,
          completedLessonIds: has
            ? e.completedLessonIds.filter((id) => id !== lessonId)
            : [...e.completedLessonIds, lessonId],
        };
      }),
    }));
    void toggleLessonAction(courseId, lessonId);
  }, []);

  const value: StoreValue = {
    ...state,
    ready: true,
    isAdmin,
    signIn,
    signUp,
    logout,
    enroll,
    confirmEnrollment,
    isEnrolled: (courseId) => state.enrollments.some((e) => e.courseId === courseId),
    toggleLesson,
    isLessonComplete: (courseId, lessonId) =>
      state.enrollments
        .find((e) => e.courseId === courseId)
        ?.completedLessonIds.includes(lessonId) ?? false,
    completedCount: (courseId) =>
      state.enrollments.find((e) => e.courseId === courseId)?.completedLessonIds.length ?? 0,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within <StoreProvider>");
  return ctx;
}
