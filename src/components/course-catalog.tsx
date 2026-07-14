"use client";

import { useEffect, useMemo, useState } from "react";
import type { Course, CourseLevel } from "@/lib/types";
import type { CatalogContent, CourseCardMicrocopy } from "@/types/content";
import { CourseCard } from "./course-card";
import EditableText from "./editable/editable-text";

type LevelFilter = "All" | CourseLevel;
type SortKey = "popular" | "az" | "lessons";

const levelTabs: LevelFilter[] = ["All", "Certification", "Coding"];

export function CourseCatalog({
  initialLevel = "All",
  courses,
  catalog,
  microcopy,
}: {
  initialLevel?: LevelFilter;
  courses: Course[];
  catalog: CatalogContent;
  microcopy: CourseCardMicrocopy;
}) {
  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "popular", label: catalog.sortPopular },
    { key: "lessons", label: catalog.sortLessons },
    { key: "az", label: catalog.sortAz },
  ];
  const [level, setLevel] = useState<LevelFilter>(initialLevel);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("popular");

  // Next.js keeps this client component mounted when only the query string
  // changes. Keep the selected filter in sync with header navigation such as
  // /courses?level=Certification and /courses?level=Coding.
  useEffect(() => {
    setLevel(initialLevel);
  }, [initialLevel]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = courses.filter((c) => {
      const matchLevel = level === "All" || c.level === level;
      const matchQuery =
        !q ||
        c.title.toLowerCase().includes(q) ||
        c.subtitle.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q));
      return matchLevel && matchQuery;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "az":
          return a.title.localeCompare(b.title);
        case "lessons":
          return b.modules.flatMap((m) => m.lessons).length - a.modules.flatMap((m) => m.lessons).length;
        default:
          return b.views - a.views;
      }
    });
    return list;
  }, [level, query, sort, courses]);

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {levelTabs.map((t) => (
            <button
              key={t}
              onClick={() => setLevel(t)}
              className={`rounded-[var(--radius)] px-4 py-2 font-mono text-sm font-semibold lowercase transition-colors ${
                level === t
                  ? "bg-ink-panel text-on-panel"
                  : "border border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink"
              }`}
            >
              {t === "All" ? catalog.allTracksLabel : t}
            </button>
          ))}
        </div>

        <div className="flex flex-1 gap-3 lg:max-w-md">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={catalog.searchPlaceholder}
            className="field"
            aria-label="Search courses"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="field max-w-[12rem]"
            aria-label="Sort courses"
          >
            {sortOptions.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-5 font-mono text-sm text-muted">
        <span className="text-line-strong">❯</span>{" "}
        <EditableText path="catalog.showingPrefix" value={catalog.showingPrefix} as="span" />{" "}
        <strong className="tnum text-ink">{filtered.length}</strong>{" "}
        {filtered.length === 1 ? (
          <EditableText path="catalog.courseWord" value={catalog.courseWord} as="span" />
        ) : (
          <EditableText path="catalog.coursesWord" value={catalog.coursesWord} as="span" />
        )}
        {level !== "All" && ` in ${level.toLowerCase()}`}
      </p>

      {filtered.length === 0 ? (
        <div className="card mt-6 p-12 text-center text-muted">
          <EditableText path="catalog.emptyState" value={catalog.emptyState} as="span" />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <CourseCard key={c.id} course={c} microcopy={microcopy} />
          ))}
        </div>
      )}
    </div>
  );
}
