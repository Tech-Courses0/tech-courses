"use client";

import Link from "next/link";
import type { Course, Instructor } from "@/lib/types";
import { LEVELS } from "@/lib/course-utils";
import { formatCompact } from "@/lib/format";
import { CourseCard } from "@/components/course-card";
import { Reveal } from "@/components/reveal";
import { Avatar } from "@/components/ui";
import { HeroTerminal } from "@/components/hero/hero-terminal";
import { AsciiCorners } from "@/components/ascii/ascii-block";
import { ArrowRightIcon } from "@/components/icons";
import EditableText from "@/components/editable/editable-text";
import EditableRepeater from "@/components/editable/editable-repeater";
import IconField from "@/components/editable/icon-field";
import { EditableDivider } from "./editable-divider";
import type { HomeContent, FeatureItem, CourseCardMicrocopy } from "@/types/content";

interface ChannelStats {
  subscribers: number;
  courseCount: number;
  lessonCount: number;
  totalViews: number;
}

interface InstructorWithStats extends Instructor {
  students: number;
  coursesCount: number;
}

export interface HomeViewProps {
  home: HomeContent;
  courseCard: CourseCardMicrocopy;
  courses: Course[];
  channelStats: ChannelStats;
  instructor: InstructorWithStats;
  heroCourse: Course | undefined;
  heroProgress: number;
  heroHref: string;
  isAuthed: boolean;
}

export function HomeView({
  home,
  courseCard,
  courses,
  channelStats,
  instructor,
  heroCourse,
  heroProgress,
  heroHref,
  isAuthed,
}: HomeViewProps) {
  const popular = [...courses].sort((a, b) => b.views - a.views).slice(0, 6);

  // Derived (DB/catalog) values, positional to home.stats. Each stat's
  // content.override wins when non-empty, else the live number shows.
  const derivedStats = [
    `${formatCompact(channelStats.subscribers)}+`,
    String(channelStats.courseCount),
    `${formatCompact(channelStats.lessonCount)}+`,
    `${formatCompact(channelStats.totalViews)}+`,
  ];

  return (
    <>
      {/* Hero — full-viewport terminal session */}
      <section className="relative">
        <div className="container-page flex min-h-[calc(100svh-4rem)] flex-col justify-center py-14 md:py-16">
          {heroCourse ? (
            <HeroTerminal
              hero={home.hero}
              title={heroCourse.title}
              level={heroCourse.level}
              code={heroCourse.code ?? heroCourse.level.slice(0, 3)}
              views={heroCourse.views}
              href={heroHref}
              progress={heroProgress}
              isAuthed={isAuthed}
            />
          ) : (
            <div>
              <h1 className="text-[clamp(2.6rem,7vw,4.6rem)] font-bold leading-[0.98] text-ink">
                <EditableText path="home.heroFallbackLead" value={home.heroFallbackLead} as="span" />{" "}
                <span className="text-accent">
                  <EditableText path="home.heroFallbackAccent" value={home.heroFallbackAccent} as="span" />
                </span>
              </h1>
              <Link href="/courses" className="btn btn-primary mt-8">
                <EditableText path="home.heroFallbackCta" value={home.heroFallbackCta} as="span" />
                <ArrowRightIcon width={16} height={16} />
              </Link>
            </div>
          )}

          {/* Stat strip — a terminal status bar */}
          <dl className="mt-12 grid grid-cols-2 divide-x divide-line border-y border-line md:mt-16 md:grid-cols-4">
            {home.stats.map((s, i) => {
              const value = s.override.trim() ? s.override : derivedStats[i];
              return (
                <div key={i} className="px-2 py-6 text-center first:pl-0">
                  <dt className="tnum font-mono text-2xl font-bold text-ink md:text-3xl">{value}</dt>
                  <dd className="mono-label mt-1">
                    {"// "}
                    <EditableText path={`home.stats.${i}.label`} value={s.label} as="span" />
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      </section>

      {/* Tracks */}
      <section className="container-page py-16 md:py-20">
        <EditableDivider indexPath="home.tracks.index" index={home.tracks.index} labelPath="home.tracks.label" label={home.tracks.label} />
        <h2 className="mt-6 text-2xl font-bold text-ink md:text-3xl">
          <EditableText path="home.tracks.title" value={home.tracks.title} as="span" />
        </h2>
        <p className="mt-2 max-w-md text-muted">
          <EditableText path="home.tracks.subtitle" value={home.tracks.subtitle} as="span" />
        </p>
        <Reveal stagger className="mt-8 grid gap-5 md:grid-cols-2">
          {LEVELS.map((lvl, i) => {
            const count = courses.filter((c) => c.level === lvl.key).length;
            return (
              <Link
                key={lvl.key}
                href={`/courses?level=${lvl.key}`}
                className="term group relative transition-colors hover:border-line-strong"
              >
                <AsciiCorners />
                <div className="term-bar">
                  <span className="term-dots" aria-hidden>
                    <span className="term-dot" />
                    <span className="term-dot" />
                    <span className="term-dot" />
                  </span>
                  <span className="term-title">tracks/{lvl.key.toLowerCase()}</span>
                  <span className="ml-auto mono-label">
                    <span className="tnum">{String(count).padStart(2, "0")}</span> courses
                  </span>
                </div>
                <div className="p-6">
                  <span className="section-marker">
                    <b>{String(i + 1).padStart(2, "0")}</b>
                    {" // "}
                    {lvl.key.toLowerCase()}
                  </span>
                  <h3 className="mt-3 text-xl font-bold text-ink">{lvl.label}</h3>
                  <p className="mt-2 text-sm text-muted">{lvl.blurb}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-accent">
                    <EditableText path="home.tracks.openLabel" value={home.tracks.openLabel} as="span" />
                    <ArrowRightIcon width={15} height={15} className="transition-transform duration-200 group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            );
          })}
        </Reveal>
      </section>

      {/* Popular courses */}
      <section className="container-page py-4">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0 flex-1">
            <EditableDivider indexPath="home.popular.index" index={home.popular.index} labelPath="home.popular.label" label={home.popular.label} />
            <h2 className="mt-6 text-2xl font-bold text-ink md:text-3xl">
              <EditableText path="home.popular.title" value={home.popular.title} as="span" />
            </h2>
          </div>
          <Link href="/courses" className="link-draw mb-1 inline-flex shrink-0 items-center gap-1.5 font-mono text-sm font-semibold text-accent">
            <EditableText path="home.popular.viewAll" value={home.popular.viewAll} as="span" />
            <ArrowRightIcon width={15} height={15} />
          </Link>
        </div>
        <Reveal stagger className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {popular.map((c) => (
            <CourseCard key={c.id} course={c} microcopy={courseCard} />
          ))}
        </Reveal>
      </section>

      {/* Features */}
      <section className="container-page py-16 md:py-24">
        <EditableDivider indexPath="home.features.index" index={home.features.index} labelPath="home.features.label" label={home.features.label} />
        <h2 className="mt-6 max-w-2xl text-2xl font-bold text-ink md:text-3xl">
          <EditableText path="home.features.title" value={home.features.title} as="span" />
        </h2>
        <Reveal stagger className="mt-10 grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-line bg-line sm:grid-cols-2">
          <EditableRepeater<FeatureItem>
            path="home.features.items"
            items={home.features.items}
            addLabel="Add feature"
            newItem={() => ({ icon: "star", title: "New feature", body: "Describe this feature." })}
            renderItem={(f, i) => (
              <div className="flex h-full gap-4 bg-surface p-7">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius)] bg-accent-tint text-accent">
                  <IconField path={`home.features.items.${i}.icon`} value={f.icon} size={19} />
                </span>
                <div>
                  <p className="mono-label">
                    <span className="text-accent">{String(i + 1).padStart(2, "0")}</span> / feature
                  </p>
                  <h3 className="mt-1 font-semibold text-ink">
                    <EditableText path={`home.features.items.${i}.title`} value={f.title} as="span" />
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    <EditableText path={`home.features.items.${i}.body`} value={f.body} as="span" />
                  </p>
                </div>
              </div>
            )}
          />
        </Reveal>
      </section>

      {/* Instructor */}
      <section className="container-page py-4">
        <EditableDivider indexPath="home.instructor.index" index={home.instructor.index} labelPath="home.instructor.label" label={home.instructor.label} />
        <h2 className="mt-6 text-2xl font-bold text-ink md:text-3xl">
          <EditableText path="home.instructor.title" value={home.instructor.title} as="span" />
        </h2>
        <Reveal stagger className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[instructor].map((ins) => (
            <div key={ins.id} className="term relative">
              <AsciiCorners />
              <div className="term-bar">
                <span className="term-title">whoami</span>
              </div>
              <div className="p-6">
                <Avatar initials={ins.initials} size={52} />
                <h3 className="mt-4 font-semibold text-ink">{ins.name}</h3>
                <p className="mono-label mt-0.5">{ins.title}</p>
                <div className="mt-4 border-t border-line pt-3">
                  <p className="tnum mono-label">
                    {formatCompact(ins.students)} subscribers · {ins.coursesCount} courses
                  </p>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{ins.bio}</p>
              </div>
            </div>
          ))}
        </Reveal>
      </section>

      {/* CTA */}
      <section className="container-page py-20">
        <Reveal className="term relative overflow-hidden">
          <AsciiCorners tone="muted" />
          <div className="term-bar">
            <span className="term-dots" aria-hidden>
              <span className="term-dot" />
              <span className="term-dot" />
              <span className="term-dot" />
            </span>
            <span className="term-title">tech-courses — start</span>
          </div>
          <div className="px-6 py-14 text-center md:py-16">
            <p className="mono-label">
              <span className="term-prompt text-accent" />
              <EditableText path="home.cta.command" value={home.cta.command} as="span" />
            </p>
            <h2 className="mx-auto mt-4 max-w-2xl text-2xl font-bold text-ink md:text-4xl">
              <EditableText path="home.cta.title" value={home.cta.title} as="span" />
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted">
              <EditableText path="home.cta.subtitle" value={home.cta.subtitle} as="span" />
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Link href={home.cta.primaryHref} className="btn btn-primary">
                <EditableText path="home.cta.primaryLabel" value={home.cta.primaryLabel} as="span" hrefPath="home.cta.primaryHref" hrefValue={home.cta.primaryHref} />
              </Link>
              <Link href={home.cta.secondaryHref} className="btn btn-outline">
                <EditableText path="home.cta.secondaryLabel" value={home.cta.secondaryLabel} as="span" hrefPath="home.cta.secondaryHref" hrefValue={home.cta.secondaryHref} />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
