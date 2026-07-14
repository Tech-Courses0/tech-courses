import Link from "next/link";
import type { Course } from "@/lib/types";
import { courseStats, getInstructor } from "@/lib/course-utils";
import { formatDuration, formatCompact } from "@/lib/format";
import { Thumbnail } from "./ui";
import { AsciiCorners } from "./ascii/ascii-block";
import { ScrambleText } from "./terminal/scramble-text";
import { PlayCircleIcon } from "./icons";
import EditableText from "./editable/editable-text";
import { defaultContent } from "@/lib/content-defaults";
import type { CourseCardMicrocopy } from "@/types/content";

/**
 * A course rendered as a terminal window. Real borders (responsive), a
 * monospace title bar that re-addresses itself on hover, the YouTube
 * thumbnail as the "preview" pane, and metadata as terminal output.
 *
 * `microcopy` carries the shared editable label strings (one content field each,
 * applied to every card). Title/subtitle/price/href stay catalog-derived. It's
 * optional so non-editable surfaces (the dashboard) render the seed labels.
 */
export function CourseCard({ course, microcopy }: { course: Course; microcopy?: CourseCardMicrocopy }) {
  const mc = microcopy ?? defaultContent().courseCard;
  const stats = courseStats(course);
  const instructor = getInstructor(course.instructorId);
  const isFree = course.priceInr === 0;
  const code = course.code ?? course.level.slice(0, 3);
  const dir = course.level === "Certification" ? "nism" : "coding";

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="term group relative flex flex-col transition-[transform,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-line-strong"
    >
      <AsciiCorners />
      <div className="term-bar">
        <span className="term-dots" aria-hidden>
          <span className="term-dot" />
          <span className="term-dot" />
          <span className="term-dot" />
        </span>
        <ScrambleText
          as="span"
          text={`~/${dir}/${code.toLowerCase().replace(/\s+/g, "-")}`}
          trigger="hover"
          hoverSelector=".term"
          className="term-title"
        />
        <span className="ml-auto mono-label text-accent">
          {isFree ? <EditableText path="courseCard.freeLabel" value={mc.freeLabel} as="span" /> : `₹${course.priceInr}`}
        </span>
      </div>

      <Thumbnail watermark={code} src={course.thumbnail || undefined} className="aspect-[16/9]">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink-panel via-ink-panel/55 to-transparent" />
        <div className="absolute left-3 top-3 flex gap-1.5">
          <span className="tag border-white/15 bg-white/10 text-on-panel">
            {course.level}
          </span>
          {course.code && (
            <span className="tag border-white/15 bg-white/10 text-on-panel-soft">
              {course.code}
            </span>
          )}
        </div>
        <span className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/10 text-on-panel opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <PlayCircleIcon width={18} height={18} />
        </span>
        <div className="absolute inset-x-4 bottom-3">
          <p className="line-clamp-2 font-mono text-sm font-semibold leading-snug text-on-panel">
            {course.title}
          </p>
        </div>
      </Thumbnail>

      <div className="flex flex-1 flex-col gap-3 p-4 font-mono">
        <p className="line-clamp-2 text-xs leading-relaxed text-muted">
          {course.subtitle}
        </p>

        {instructor && (
          <p className="mono-label text-ink-soft">@ {instructor.name}</p>
        )}

        <div className="mt-auto grid grid-cols-3 gap-2 border-t border-line pt-3 text-[0.68rem]">
          <span className="flex flex-col">
            <span className="text-line-strong">
              <EditableText path="courseCard.lessonsLabel" value={mc.lessonsLabel} as="span" />
            </span>
            <span className="tnum text-ink">{stats.lessonCount}</span>
          </span>
          <span className="flex flex-col">
            <span className="text-line-strong">
              <EditableText path="courseCard.runtimeLabel" value={mc.runtimeLabel} as="span" />
            </span>
            <span className="tnum text-ink">{formatDuration(stats.totalMinutes)}</span>
          </span>
          <span className="flex flex-col">
            <span className="text-line-strong">
              <EditableText path="courseCard.viewsLabel" value={mc.viewsLabel} as="span" />
            </span>
            <span className="tnum text-accent">{formatCompact(course.views)}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
