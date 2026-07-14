import "server-only";
import { cache } from "react";
import { prisma } from "./prisma";
import type { Course, CourseLevel } from "./types";
import { INSTRUCTOR, INSTRUCTOR_ID } from "./course-utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDate(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

type DbCourse = Awaited<ReturnType<typeof rawCourse>>;
function rawCourse() {
  return prisma.course.findFirstOrThrow({ include: { lessons: true } });
}

// Break long courses into "Parts" so they feel finishable (microlearning).
const SECTION_SIZE = 15;
function sectionize(
  courseId: string,
  defaultTitle: string,
  lessons: Course["modules"][number]["lessons"],
): Course["modules"] {
  if (lessons.length <= 20) {
    return [{ id: `${courseId}-m1`, title: defaultTitle, lessons }];
  }
  const modules: Course["modules"] = [];
  for (let i = 0; i < lessons.length; i += SECTION_SIZE) {
    const chunk = lessons.slice(i, i + SECTION_SIZE);
    modules.push({
      id: `${courseId}-m${modules.length + 1}`,
      title: `Part ${modules.length + 1} · Lessons ${i + 1}–${i + chunk.length}`,
      lessons: chunk,
    });
  }
  return modules;
}

function buildCourse(c: NonNullable<DbCourse>): Course {
  const level: CourseLevel = c.track === "CERTIFICATION" ? "Certification" : "Coding";
  const lessons = [...c.lessons]
    .sort((a, b) => a.position - b.position)
    .map((l, i) => ({
      id: l.id,
      title: l.titleOverride || l.title,
      youtubeId: l.ytVideoId,
      thumbnail: l.thumbnail || `https://i.ytimg.com/vi/${l.ytVideoId}/mqdefault.jpg`,
      durationMinutes: Math.max(1, Math.round(l.seconds / 60)),
      views: l.views,
      isPreview: i === 0,
    }));

  const title = c.titleOverride || c.ytTitle;
  const subtitle =
    c.track === "CERTIFICATION"
      ? `NISM certification prep · ${lessons.length} chapters`
      : `${lessons.length} lessons · self-paced`;

  const description =
    c.descOverride ||
    c.ytDescription.trim() ||
    `A complete ${level === "Certification" ? "exam-prep" : "self-paced"} course: ${title}. ${lessons.length} lessons, taught by the Tech Courses team.`;

  const requirements =
    c.track === "CERTIFICATION"
      ? ["Interest in India's securities markets", "No prior certification required to start"]
      : ["A computer and a code editor", "No prior experience needed for the fundamentals"];

  return {
    id: c.id,
    slug: c.slug,
    title,
    subtitle,
    level,
    code: c.code ?? undefined,
    description,
    instructorId: INSTRUCTOR_ID,
    priceInr: c.priceInr,
    mrpInr: c.mrpInr,
    views: c.views,
    lastUpdated: fmtDate(c.syncedAt),
    language: "English",
    thumbnail: c.thumbnail,
    tags: [level, c.code, "English"].filter(Boolean) as string[],
    whatYouLearn: lessons.slice(0, 6).map((l) => l.title),
    requirements,
    modules: sectionize(
      c.id,
      c.track === "CERTIFICATION" ? "Course Chapters" : "Course Content",
      lessons,
    ),
    examInfo: c.examInfo ?? undefined,
    mockTestUrl: c.mockTestUrl ?? undefined,
  };
}

export const getCourses = cache(async (): Promise<Course[]> => {
  const rows = await prisma.course.findMany({
    where: { published: true },
    orderBy: [{ order: "asc" }, { ytTitle: "asc" }],
    include: { lessons: true },
  });
  return rows.map(buildCourse);
});

export const getCourseBySlug = cache(async (slug: string): Promise<Course | null> => {
  const row = await prisma.course.findFirst({
    where: { slug, published: true },
    include: { lessons: true },
  });
  return row ? buildCourse(row) : null;
});

export const getCourseById = cache(async (id: string): Promise<Course | null> => {
  const row = await prisma.course.findFirst({
    where: { id, published: true },
    include: { lessons: true },
  });
  return row ? buildCourse(row) : null;
});

export const getChannelStats = cache(async () => {
  const [channel, courseCount, lessonAgg] = await Promise.all([
    prisma.channel.findUnique({ where: { id: "singleton" } }),
    prisma.course.count({ where: { published: true } }),
    prisma.lesson.aggregate({
      where: { course: { published: true } },
      _count: true,
      _sum: { seconds: true },
    }),
  ]);
  return {
    subscribers: channel?.subscribers ?? 0,
    totalViews: channel?.totalViews ?? 0,
    videoCount: channel?.videoCount ?? 0,
    courseCount,
    lessonCount: lessonAgg._count,
    totalHours: Math.round((lessonAgg._sum.seconds ?? 0) / 3600),
    lastSynced: channel ? fmtDate(channel.syncedAt) : null,
  };
});

// How many learners have enrolled in a course (real social proof).
export const getEnrolledCount = cache(async (courseId: string): Promise<number> => {
  return prisma.enrollment.count({ where: { courseId } });
});

export const getInstructorWithStats = cache(async () => {
  const stats = await getChannelStats();
  return { ...INSTRUCTOR, students: stats.subscribers, coursesCount: stats.courseCount };
});

// ── Course Studio (admin): raw rows incl. unpublished, with lessons ──

export interface AdminLessonRow {
  id: string;
  ytVideoId: string;
  title: string;
  titleOverride: string | null;
  thumbnail: string;
  seconds: number;
  views: number;
  position: number;
  manuallyAdded: boolean;
}

export interface AdminCourseRow {
  id: string;
  slug: string;
  ytTitle: string;
  title: string;
  published: boolean;
  track: string;
  level: string;
  code: string | null;
  order: number;
  priceInr: number;
  mrpInr: number;
  views: number;
  lessonCount: number;
  titleOverride: string | null;
  descOverride: string | null;
  examInfo: string | null;
  mockTestUrl: string | null;
  syncedAt: string;
  lessons: AdminLessonRow[];
}

export async function getAdminCourses(): Promise<AdminCourseRow[]> {
  const rows = await prisma.course.findMany({
    orderBy: [{ published: "desc" }, { order: "asc" }, { ytTitle: "asc" }],
    include: { lessons: { orderBy: { position: "asc" } } },
  });
  return rows.map((r: (typeof rows)[number]) => ({
    id: r.id,
    slug: r.slug,
    ytTitle: r.ytTitle,
    title: r.titleOverride || r.ytTitle,
    published: r.published,
    track: r.track,
    level: r.level,
    code: r.code,
    order: r.order,
    priceInr: r.priceInr,
    mrpInr: r.mrpInr,
    views: r.views,
    lessonCount: r.lessons.length,
    titleOverride: r.titleOverride,
    descOverride: r.descOverride,
    examInfo: r.examInfo,
    mockTestUrl: r.mockTestUrl,
    syncedAt: fmtDate(r.syncedAt),
    lessons: r.lessons.map((l: (typeof r.lessons)[number]) => ({
      id: l.id,
      ytVideoId: l.ytVideoId,
      title: l.title,
      titleOverride: l.titleOverride,
      thumbnail: l.thumbnail,
      seconds: l.seconds,
      views: l.views,
      position: l.position,
      manuallyAdded: l.manuallyAdded,
    })),
  }));
}
