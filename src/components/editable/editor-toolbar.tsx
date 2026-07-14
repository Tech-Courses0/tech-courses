"use client";

import { useState, useEffect } from "react";
import { Undo2, Redo2, LogOut, Rocket, Settings, Check, HelpCircle, X, History, RotateCcw } from "lucide-react";
import { cx } from "@/lib/cx";
import { useEditor } from "./editor-context";

interface EditorToolbarProps {
  pages?: { id: string; label: string }[];
  activePage?: string;
  onPageChange?: (id: string) => void;
  settingsOpen?: boolean;
  onSettingsToggle?: () => void;
}

export default function EditorToolbar({
  pages,
  activePage,
  onPageChange,
  settingsOpen,
  onSettingsToggle,
}: EditorToolbarProps) {
  const { undo, redo, canUndo, canRedo, saveStatus, publish, publishing, published } = useEditor();
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [publishMessage, setPublishMessage] = useState("");
  const [publishError, setPublishError] = useState<string | null>(null);

  const statusLabel =
    saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Save failed" : "";

  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex h-12 items-center justify-between gap-2 overflow-x-auto bg-ink-panel px-4 font-mono text-on-panel shadow-lg">
      <div className="flex flex-shrink-0 items-center gap-3">
        <span className="hidden text-[0.8rem] font-bold tracking-[0.05em] sm:inline">Editor</span>
        <HelpButton />

        {pages && pages.length > 0 && (
          <div className="ml-1 flex items-center gap-0.5 rounded-md bg-white/10 p-0.5">
            {pages.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onPageChange?.(p.id)}
                className={cx(
                  "rounded px-2.5 py-1 text-[0.7rem] font-medium transition-colors duration-150",
                  activePage === p.id ? "bg-white text-black" : "text-white/60 hover:text-white",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        <div className="ml-2 flex items-center gap-1">
          <button type="button" title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={undo} className="rounded p-1.5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent">
            <Undo2 size={15} />
          </button>
          <button type="button" title="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={redo} className="rounded p-1.5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent">
            <Redo2 size={15} />
          </button>
        </div>
        {statusLabel && (
          <span className={cx("text-[0.72rem]", saveStatus === "error" ? "text-red-300" : "text-white/50")}>{statusLabel}</span>
        )}
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onSettingsToggle}
          className={cx(
            "flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[0.72rem] transition-colors",
            settingsOpen ? "bg-white/15 text-white" : "text-white/60 hover:text-white",
          )}
        >
          <Settings size={13} /> Settings
        </button>
        <HistoryButton />
        {/* POST, never a <Link> — a prefetched GET logout would delete the
            session cookie the moment the editor renders in production. */}
        <button
          type="button"
          onClick={async () => {
            await fetch("/api/editor/logout", { method: "POST" });
            window.location.href = "/admin/login";
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[0.72rem] text-white/60 no-underline hover:text-white"
        >
          <LogOut size={13} /> Exit
        </button>
        <button
          type="button"
          onClick={() => {
            setPublishMessage("");
            setPublishError(null);
            setConfirmPublish(true);
          }}
          disabled={publishing}
          className={cx(
            "flex items-center gap-1.5 rounded-sm px-4 py-1.5 text-[0.75rem] font-semibold uppercase tracking-[0.04em] transition-colors duration-150 disabled:opacity-50",
            published ? "bg-green-600 text-white" : "bg-accent text-accent-ink hover:opacity-90",
          )}
        >
          {published ? <Check size={13} /> : <Rocket size={13} />}
          {published ? "Published" : publishing ? "Publishing…" : "Publish"}
        </button>
      </div>

      {confirmPublish && (
        <PublishDialog
          message={publishMessage}
          onMessageChange={setPublishMessage}
          error={publishError}
          onCancel={() => setConfirmPublish(false)}
          onConfirm={async () => {
            const trimmed = publishMessage.trim();
            if (!trimmed) {
              setPublishError("Describe what changed before publishing.");
              return;
            }
            setConfirmPublish(false);
            await publish(trimmed);
          }}
        />
      )}
    </div>
  );
}

const HELP_SEEN_KEY = "ca_editor_help_seen";

const HELP_TIPS: [string, string][] = [
  ["Edit text", "Click any text on the page and type. Changes save automatically."],
  ["Switch pages", "Use the tabs at the top to move between Home and Courses."],
  ["Add or remove items", "Click a nav link, footer link or feature card to reveal move, duplicate and delete controls, plus an “Add” button."],
  ["Images & icons", "Click the logo upload in Settings, or a feature icon to pick a new one."],
  ["Go live", "Nothing is public until you press Publish. Use History to revert a past version or reset the whole site."],
];

function HelpButton() {
  const [open, setOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(HELP_SEEN_KEY)) setOpen(true);
  }, []);

  function close() {
    setOpen(false);
    if (dontShowAgain) {
      try {
        localStorage.setItem(HELP_SEEN_KEY, "1");
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <>
      <button type="button" title="How to edit this site" onClick={() => (open ? close() : setOpen(true))} className="rounded p-1.5 text-white/70 hover:bg-white/10 hover:text-white">
        <HelpCircle size={16} />
      </button>
      {open && (
        <div className="fixed inset-0 z-[130] flex items-start justify-center bg-black/40 pt-20" onClick={close}>
          <div className="w-[min(92vw,460px)] rounded-lg bg-surface p-6 normal-case tracking-normal text-ink shadow-pop" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <h2 className="text-[1.35rem] font-bold">Editing your website</h2>
              <button type="button" onClick={close} className="p-1 text-muted hover:text-ink" title="Close">
                <X size={18} />
              </button>
            </div>
            <ul className="flex flex-col gap-3">
              {HELP_TIPS.map(([title, body]) => (
                <li key={title}>
                  <p className="text-[0.82rem] font-semibold text-ink">{title}</p>
                  <p className="text-[0.82rem] leading-relaxed text-muted">{body}</p>
                </li>
              ))}
            </ul>
            <label className="mt-5 flex cursor-pointer select-none items-center gap-2 text-[0.78rem] text-muted">
              <input type="checkbox" checked={dontShowAgain} onChange={(e) => setDontShowAgain(e.target.checked)} className="accent-accent" />
              Don&apos;t show this again
            </label>
            <button type="button" onClick={close} className="mt-3 w-full rounded-sm bg-ink py-2.5 text-[0.8rem] font-semibold uppercase tracking-[0.04em] text-bg transition-colors hover:bg-accent">
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

interface HistoryEntry {
  id: number;
  message: string;
  createdAt: string;
}

function relativeTime(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function HistoryButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [revertId, setRevertId] = useState<number | null>(null);
  const [reverting, setReverting] = useState(false);
  const [confirmOriginal, setConfirmOriginal] = useState(false);
  const [revertingOriginal, setRevertingOriginal] = useState(false);

  async function openPanel() {
    setOpen(true);
    setLoading(true);
    try {
      const res = await fetch("/api/editor/history");
      const data = await res.json();
      setEntries(res.ok ? data.history : []);
    } finally {
      setLoading(false);
    }
  }

  async function revert(id: number) {
    setReverting(true);
    try {
      const res = await fetch("/api/editor/history/revert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) window.location.reload();
    } finally {
      setReverting(false);
    }
  }

  async function revertOriginal() {
    setRevertingOriginal(true);
    try {
      const res = await fetch("/api/editor/history/revert-original", { method: "POST" });
      if (res.ok) window.location.reload();
    } finally {
      setRevertingOriginal(false);
    }
  }

  return (
    <>
      <button type="button" onClick={openPanel} className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[0.72rem] text-white/60 transition-colors hover:text-white">
        <History size={13} /> <span className="hidden md:inline">History</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-[130] flex items-start justify-center bg-black/40 pt-20" onClick={() => setOpen(false)}>
          <div className="w-[min(92vw,440px)] rounded-lg bg-surface p-6 normal-case tracking-normal text-ink shadow-pop" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-start justify-between">
              <h2 className="text-[1.25rem] font-bold">Publish history</h2>
              <button type="button" onClick={() => setOpen(false)} className="p-1 text-muted hover:text-ink" title="Close">
                <X size={18} />
              </button>
            </div>
            <p className="mb-4 text-[0.78rem] text-muted">
              The last 5 published versions. Revert loads that version back into your draft — it goes live once you Publish again.
            </p>

            {loading && <p className="py-4 text-center text-[0.82rem] text-muted">Loading…</p>}
            {!loading && entries && entries.length === 0 && (
              <p className="py-4 text-center text-[0.82rem] text-muted">Nothing published yet.</p>
            )}
            {!loading && entries && entries.length > 0 && (
              <ul className="flex flex-col divide-y divide-line">
                {entries.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[0.84rem] font-medium text-ink">{entry.message}</p>
                      <p className="text-[0.7rem] text-muted">{relativeTime(entry.createdAt)}</p>
                    </div>
                    {revertId === entry.id ? (
                      <div className="flex flex-shrink-0 items-center gap-1.5">
                        <button type="button" disabled={reverting} onClick={() => revert(entry.id)} className="rounded-sm bg-red-600 px-2.5 py-1.5 text-[0.72rem] font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                          {reverting ? "Reverting…" : "Confirm"}
                        </button>
                        <button type="button" onClick={() => setRevertId(null)} className="rounded-sm px-2 py-1.5 text-[0.72rem] font-medium text-muted hover:bg-surface-2">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setRevertId(entry.id)} className="flex-shrink-0 rounded-sm px-2.5 py-1.5 text-[0.72rem] font-semibold text-accent hover:bg-surface-2">
                        Revert
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 border-t border-line pt-4">
              {confirmOriginal ? (
                <div>
                  <p className="mb-2 text-[0.78rem] leading-relaxed text-red-700">
                    This resets the whole site back to its original launch content. It goes live immediately, not just the draft. This cannot be undone from here.
                  </p>
                  <div className="flex items-center gap-2">
                    <button type="button" disabled={revertingOriginal} onClick={revertOriginal} className="rounded-sm bg-red-600 px-3 py-1.5 text-[0.76rem] font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                      {revertingOriginal ? "Resetting…" : "Yes, reset everything"}
                    </button>
                    <button type="button" onClick={() => setConfirmOriginal(false)} className="rounded-sm px-3 py-1.5 text-[0.76rem] font-medium text-muted hover:bg-surface-2">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmOriginal(true)} className="flex items-center gap-1.5 text-[0.78rem] font-medium text-red-700 hover:text-red-800">
                  <RotateCcw size={13} /> Revert to original — undo every edit ever made
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PublishDialog({
  message,
  onMessageChange,
  error,
  onConfirm,
  onCancel,
}: {
  message: string;
  onMessageChange: (v: string) => void;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div className="w-[min(92vw,380px)] rounded-lg bg-surface p-6 normal-case tracking-normal text-ink shadow-pop" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-2 text-[1.25rem] font-bold">Publish changes?</h2>
        <p className="mb-5 text-[0.85rem] leading-relaxed text-muted">
          This makes your current edits live on the public website immediately. Visitors will see them right away.
        </p>
        <div className="mb-5">
          <label className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-[0.04em] text-muted">What changed?</label>
          <input
            type="text"
            autoFocus
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onConfirm();
            }}
            placeholder="e.g. Updated hero copy and footer links"
            className="w-full rounded border border-line bg-surface px-2.5 py-2 text-[0.82rem] text-ink focus:border-accent focus:outline-none"
          />
          <p className="mt-1 text-[0.7rem] text-muted">Saved as this publish&apos;s label in History.</p>
          {error && <p className="mt-1 text-[0.72rem] text-red-600">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-sm px-4 py-2 text-[0.8rem] font-medium text-muted hover:bg-surface-2">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="rounded-sm bg-accent px-4 py-2 text-[0.8rem] font-semibold text-accent-ink hover:opacity-90">
            Publish now
          </button>
        </div>
      </div>
    </div>
  );
}
