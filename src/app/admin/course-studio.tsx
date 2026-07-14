"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCompact } from "@/lib/format";
import type { AdminCourseRow, AdminLessonRow } from "@/lib/catalog";
import {
  updateCourseAction,
  syncNowAction,
  addAdminAction,
  removeAdminAction,
  updateLessonAction,
  addLessonAction,
  removeLessonAction,
  type CoursePatch,
} from "@/lib/admin-actions";

interface AdminEntry {
  email: string;
  removable: boolean;
}

const TRACKS = [
  { value: "CERTIFICATION", label: "Certification" },
  { value: "CODING", label: "Coding" },
  { value: "OTHER", label: "Other (hidden)" },
];

function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Portal-based tooltip — escapes any overflow:hidden ancestor.
function InfoTip({ text }: { text: string }) {
  const [tooltip, setTooltip] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  function show() {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setTooltip({ top: r.top + window.scrollY, left: r.left + r.width / 2 + window.scrollX });
  }

  return (
    <span className="relative inline-flex align-middle">
      <button
        ref={btnRef}
        type="button"
        aria-label="More info"
        className="grid h-4 w-4 cursor-help place-items-center rounded-full border border-line-strong text-[10px] font-bold leading-none text-muted transition-colors hover:border-accent hover:text-accent"
        onMouseEnter={show}
        onMouseLeave={() => setTooltip(null)}
        onFocus={show}
        onBlur={() => setTooltip(null)}
      >
        i
      </button>
      {tooltip &&
        createPortal(
          <span
            role="tooltip"
            style={{ position: "absolute", top: tooltip.top - 8, left: tooltip.left, transform: "translate(-50%, -100%)" }}
            className="pointer-events-none z-[9999] w-60 rounded-[var(--radius)] border border-line bg-ink-panel px-3 py-2 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-on-panel shadow-pop"
          >
            {text}
          </span>,
          document.body,
        )}
    </span>
  );
}

export function CourseStudio({
  courses,
  stats,
  admins,
  currentEmail,
}: {
  courses: AdminCourseRow[];
  stats: {
    subscribers: number;
    totalViews: number;
    courseCount: number;
    lessonCount: number;
    lastSynced: string | null;
  };
  admins: AdminEntry[];
  currentEmail: string;
}) {
  const router = useRouter();
  const [syncing, startSync] = useTransition();
  const [syncMsg, setSyncMsg] = useState<string>("");

  function doSync() {
    setSyncMsg("");
    startSync(async () => {
      const res = await syncNowAction();
      if (res.ok && res.result) {
        setSyncMsg(`Synced ${res.result.courses} courses, ${res.result.lessons} lessons.`);
        router.refresh();
      } else {
        setSyncMsg(res.error || "Sync failed.");
      }
    });
  }

  const statCards = [
    { label: "Subscribers", value: formatCompact(stats.subscribers) },
    { label: "Published courses", value: String(stats.courseCount) },
    { label: "Lessons live", value: formatCompact(stats.lessonCount) },
    { label: "Total views", value: formatCompact(stats.totalViews) },
  ];

  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="container-page flex flex-wrap items-end justify-between gap-4 py-10">
          <div>
            <p className="eyebrow">Course Studio</p>
            <h1 className="mt-2 text-3xl font-extrabold text-ink">Manage your courses</h1>
            <p className="mt-1 max-w-2xl text-muted">
              Your YouTube playlists appear here automatically. Hover the{" "}
              <span className="inline-grid h-4 w-4 place-items-center rounded-full border border-line-strong text-[10px] font-bold text-muted">
                i
              </span>{" "}
              icons to learn what each control does.
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-2">
              <InfoTip text="Pulls the latest playlists and videos from your YouTube channel into the site. Click this right after you add, remove, or reorder videos on YouTube. It also runs automatically every night." />
              <button onClick={doSync} disabled={syncing} className="btn btn-primary">
                {syncing ? "Syncing…" : "Sync now"}
              </button>
            </div>
            <p className="mt-2 text-xs text-muted">
              {syncMsg || (stats.lastSynced ? `Last synced ${stats.lastSynced}` : "Not synced yet")}
            </p>
          </div>
        </div>
      </section>

      <section className="container-page py-10">
        <div className="grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((s) => (
            <div key={s.label} className="bg-surface p-5">
              <p className="eyebrow">{s.label}</p>
              <p className="tnum mt-2 text-2xl font-extrabold text-ink">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="card mt-10">
          <div className="flex items-center justify-between rounded-t-[var(--radius-lg)] border-b border-line px-6 py-4">
            <h2 className="font-bold text-ink">All playlists ({courses.length})</h2>
            <p className="text-xs text-muted">Changes go live instantly.</p>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line bg-surface-2 px-6 py-3 text-xs font-medium text-ink-soft">
            <span className="inline-flex items-center gap-1.5">
              Publish
              <InfoTip text="Turn this ON to show the course on the live website. OFF keeps it hidden (a draft). Shorts and giveaway playlists are off by default." />
            </span>
            <span className="inline-flex items-center gap-1.5">
              Track
              <InfoTip text="Which section the course belongs to: Certification (NISM exams) or Coding. 'Other (hidden)' won't show even if published." />
            </span>
            <span className="inline-flex items-center gap-1.5">
              Order
              <InfoTip text="Sort position. Lower numbers appear first on the site. Use it to put your most important courses at the top." />
            </span>
            <span className="inline-flex items-center gap-1.5">
              Edit copy
              <InfoTip text="Optional: rename the course, write a custom description, add exam details, or attach a mock-test link — all shown on the course page." />
            </span>
          </div>

          <div className="divide-y divide-line">
            {courses.map((c) => (
              <CourseRow key={c.id} course={c} />
            ))}
          </div>
        </div>

        <TeamAccess admins={admins} currentEmail={currentEmail} />
      </section>
    </>
  );
}

function TeamAccess({ admins, currentEmail }: { admins: AdminEntry[]; currentEmail: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, startPending] = useTransition();

  function add() {
    setMsg("");
    startPending(async () => {
      const res = await addAdminAction(email);
      if (res.ok) {
        setEmail("");
        router.refresh();
      } else {
        setMsg(res.error || "Could not add admin.");
      }
    });
  }

  function remove(target: string) {
    startPending(async () => {
      await removeAdminAction(target);
      router.refresh();
    });
  }

  return (
    <div className="card mt-10">
      <div className="flex items-center gap-2 rounded-t-[var(--radius-lg)] border-b border-line px-6 py-4">
        <h2 className="font-bold text-ink">Team access</h2>
        <InfoTip text="People listed here can open Course Studio and manage courses. Add a teammate by their email — they get access the moment they sign in with it. 'Owner' admins are set in configuration and can't be removed here." />
      </div>

      <ul className="divide-y divide-line">
        {admins.map((a) => (
          <li key={a.email} className="flex items-center justify-between gap-3 px-6 py-3">
            <span className="min-w-0 truncate text-sm text-ink">
              {a.email}
              {a.email === currentEmail && <span className="ml-2 text-xs text-muted">(you)</span>}
            </span>
            {a.removable ? (
              <button
                onClick={() => remove(a.email)}
                disabled={pending}
                className="text-xs font-medium text-danger hover:underline"
              >
                Remove
              </button>
            ) : (
              <span className="tag">Owner</span>
            )}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-end gap-3 border-t border-line p-4">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-ink-soft">Add an admin by email</label>
          <input
            className="field"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@example.com"
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
        </div>
        <button onClick={add} disabled={pending || !email} className="btn btn-primary">
          {pending ? "Saving…" : "Add admin"}
        </button>
      </div>
      {msg && <p className="px-4 pb-4 text-xs text-danger">{msg}</p>}
    </div>
  );
}

function CourseRow({ course }: { course: AdminCourseRow }) {
  const router = useRouter();
  const [, startSave] = useTransition();
  const [published, setPublished] = useState(course.published);
  const [track, setTrack] = useState(course.track);
  const [order, setOrder] = useState(String(course.order));
  const [showCopy, setShowCopy] = useState(false);
  const [showVideos, setShowVideos] = useState(false);
  const [titleOverride, setTitleOverride] = useState(course.titleOverride ?? "");
  const [descOverride, setDescOverride] = useState(course.descOverride ?? "");
  const [priceInr, setPriceInr] = useState(String(course.priceInr));
  const [mrpInr, setMrpInr] = useState(String(course.mrpInr));
  const [examInfo, setExamInfo] = useState(course.examInfo ?? "");
  const [mockTestUrl, setMockTestUrl] = useState(course.mockTestUrl ?? "");
  const [saved, setSaved] = useState(false);

  function save(patch: CoursePatch) {
    setSaved(false);
    startSave(async () => {
      await updateCourseAction(course.id, patch);
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="px-6 py-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Publish toggle */}
        <button
          onClick={() => {
            const v = !published;
            setPublished(v);
            save({ published: v });
          }}
          role="switch"
          aria-checked={published}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${published ? "bg-accent" : "bg-line-strong"}`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${published ? "left-[22px]" : "left-0.5"}`}
          />
        </button>

        {/* Title */}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink">{titleOverride || course.ytTitle}</p>
          <p className="tnum text-xs text-muted">
            {course.lessonCount} videos · {formatCompact(course.views)} views
            {course.published && (
              <>
                {" · "}
                <Link href={`/courses/${course.slug}`} className="text-accent hover:underline">
                  view
                </Link>
              </>
            )}
          </p>
        </div>

        {/* Track */}
        <select
          value={track}
          onChange={(e) => {
            setTrack(e.target.value);
            save({ track: e.target.value });
          }}
          className="field max-w-[10rem]"
          aria-label="Track"
        >
          {TRACKS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        {/* Order */}
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            onBlur={() => save({ order: Number(order) || 0 })}
            className="field w-20 tnum"
            aria-label="Sort order"
            title="Lower numbers appear first on the site"
          />
          <InfoTip text="Sort position — lower numbers appear first on the site. Use this to put your most important courses at the top." />
        </div>

        <button onClick={() => setShowVideos((x) => !x)} className="btn btn-ghost text-sm">
          {showVideos ? "Hide videos" : `Videos (${course.lessonCount})`}
        </button>
        <button onClick={() => setShowCopy((x) => !x)} className="btn btn-ghost text-sm">
          {showCopy ? "Close" : "Edit copy"}
        </button>
        {saved && <span className="text-xs text-accent">Saved</span>}
      </div>

      {showVideos && (
        <VideoList courseId={course.id} lessons={course.lessons} onRefresh={() => router.refresh()} />
      )}

      {showCopy && (
        <div className="mt-4 grid gap-3 rounded-[var(--radius)] border border-line bg-surface-2 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">
              Title override (leave blank to use the YouTube title)
            </label>
            <input
              className="field"
              value={titleOverride}
              onChange={(e) => setTitleOverride(e.target.value)}
              onBlur={() => save({ titleOverride: titleOverride.trim() || null })}
              placeholder={course.ytTitle}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-soft">
                Price (₹, 0 = free)
              </label>
              <input
                type="number"
                min={0}
                className="field tnum"
                value={priceInr}
                onChange={(e) => setPriceInr(e.target.value)}
                onBlur={() => save({ priceInr: Number(priceInr) || 0 })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-soft">
                MRP (₹, shown struck-through)
              </label>
              <input
                type="number"
                min={0}
                className="field tnum"
                value={mrpInr}
                onChange={(e) => setMrpInr(e.target.value)}
                onBlur={() => save({ mrpInr: Number(mrpInr) || 0 })}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Description override</label>
            <textarea
              className="field min-h-20"
              value={descOverride}
              onChange={(e) => setDescOverride(e.target.value)}
              onBlur={() => save({ descOverride: descOverride.trim() || null })}
              placeholder="Custom course description shown on the course page…"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">
              Exam information (passing %, fees, format — shown on certification courses)
            </label>
            <textarea
              className="field min-h-20"
              value={examInfo}
              onChange={(e) => setExamInfo(e.target.value)}
              onBlur={() => save({ examInfo: examInfo.trim() || null })}
              placeholder="e.g. 60% to pass · ₹1500 fee · 100 MCQs · 2 hours · valid 3 years"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">
              Mock test link (a button appears on the course page when set)
            </label>
            <input
              className="field"
              value={mockTestUrl}
              onChange={(e) => setMockTestUrl(e.target.value)}
              onBlur={() => save({ mockTestUrl: mockTestUrl.trim() || null })}
              placeholder="https://… link to your practice test / Google Form / quiz"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function VideoList({
  courseId,
  lessons,
  onRefresh,
}: {
  courseId: string;
  lessons: AdminLessonRow[];
  onRefresh: () => void;
}) {
  const [addInput, setAddInput] = useState("");
  const [addMsg, setAddMsg] = useState("");
  const [adding, startAdding] = useTransition();

  function doAdd() {
    setAddMsg("");
    startAdding(async () => {
      const res = await addLessonAction(courseId, addInput.trim());
      if (res.ok) {
        setAddInput("");
        onRefresh();
      } else {
        setAddMsg(res.error || "Could not add video.");
      }
    });
  }

  return (
    <div className="mt-4 rounded-[var(--radius)] border border-line bg-surface-2">
      {/* Header */}
      <div className="grid grid-cols-[2rem_3rem_1fr_5rem_5rem_5rem] gap-2 border-b border-line px-4 py-2 text-xs font-medium text-ink-soft">
        <span>#</span>
        <span />
        <span>Title</span>
        <span className="text-right">Duration</span>
        <span className="text-right">Views</span>
        <span />
      </div>

      {lessons.length === 0 && (
        <p className="px-4 py-6 text-center text-sm text-muted">No videos yet. Add one below.</p>
      )}

      <div className="divide-y divide-line">
        {lessons.map((lesson) => (
          <VideoRow key={lesson.id} lesson={lesson} onRefresh={onRefresh} />
        ))}
      </div>

      {/* Add video */}
      <div className="flex flex-wrap items-end gap-3 border-t border-line p-4">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-ink-soft">
            Add a video — paste a YouTube URL or video ID
          </label>
          <input
            className="field"
            value={addInput}
            onChange={(e) => setAddInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addInput.trim() && doAdd()}
            placeholder="https://youtube.com/watch?v=… or dQw4w9WgXcQ"
          />
        </div>
        <button onClick={doAdd} disabled={adding || !addInput.trim()} className="btn btn-primary">
          {adding ? "Adding…" : "Add video"}
        </button>
      </div>
      {addMsg && <p className="px-4 pb-4 text-xs text-danger">{addMsg}</p>}
    </div>
  );
}

function VideoRow({ lesson, onRefresh }: { lesson: AdminLessonRow; onRefresh: () => void }) {
  const [title, setTitle] = useState(lesson.titleOverride ?? lesson.title);
  const [position, setPosition] = useState(String(lesson.position));
  const [, startSave] = useTransition();
  const [, startRemove] = useTransition();

  function saveTitle() {
    const override = title.trim() === lesson.title ? null : title.trim() || null;
    startSave(async () => {
      await updateLessonAction(lesson.id, { titleOverride: override });
      onRefresh();
    });
  }

  function savePosition() {
    startSave(async () => {
      await updateLessonAction(lesson.id, { position: Number(position) || 0 });
      onRefresh();
    });
  }

  function remove() {
    startRemove(async () => {
      await removeLessonAction(lesson.id);
      onRefresh();
    });
  }

  return (
    <div className="grid grid-cols-[2rem_3rem_1fr_5rem_5rem_5rem] items-center gap-2 px-4 py-2 text-sm">
      <input
        type="number"
        value={position}
        onChange={(e) => setPosition(e.target.value)}
        onBlur={savePosition}
        className="field w-full tnum px-1 py-0.5 text-xs"
        aria-label="Position"
      />
      {lesson.thumbnail ? (
        <img
          src={lesson.thumbnail}
          alt=""
          className="h-8 w-12 rounded object-cover"
        />
      ) : (
        <div className="h-8 w-12 rounded bg-surface-2" />
      )}
      <div className="min-w-0">
        <input
          className="field w-full py-0.5 text-xs"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          title={lesson.title}
        />
        {lesson.manuallyAdded && (
          <span className="mt-0.5 block text-[10px] text-accent">manually added</span>
        )}
      </div>
      <p className="tnum text-right text-xs text-muted">{fmtDuration(lesson.seconds)}</p>
      <p className="tnum text-right text-xs text-muted">{formatCompact(lesson.views)}</p>
      <div className="flex justify-end">
        <button
          onClick={remove}
          className="text-xs text-danger hover:underline"
          title="Remove from this playlist"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
