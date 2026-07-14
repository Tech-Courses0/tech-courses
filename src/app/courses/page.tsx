import type { Metadata } from "next";
import { CourseCatalog } from "@/components/course-catalog";
import { getCourses } from "@/lib/catalog";
import { getLiveContent } from "@/lib/site-content";
import type { CourseLevel } from "@/lib/types";
import { CoursesHeader } from "@/components/views/courses-header";

// Editable header content must reflect a Publish without a redeploy.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "All courses",
  description:
    "Browse free NISM certification and coding courses from the Tech Courses channel.",
};

const validLevels: CourseLevel[] = ["Certification", "Coding"];

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  const { level } = await searchParams;
  const initialLevel =
    level && validLevels.includes(level as CourseLevel)
      ? (level as CourseLevel)
      : "All";

  const [courses, content] = await Promise.all([getCourses(), getLiveContent()]);

  const header = initialLevel === "All" ? content.courses : content.coursesByLevel[initialLevel];
  const basePath = initialLevel === "All" ? "courses" : `coursesByLevel.${initialLevel}`;

  return (
    <>
      <CoursesHeader header={header} basePath={basePath} />

      <section className="container-page py-10">
        <CourseCatalog
          initialLevel={initialLevel}
          courses={courses}
          catalog={content.catalog}
          microcopy={content.courseCard}
        />
      </section>
    </>
  );
}
