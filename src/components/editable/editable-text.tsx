"use client";

import { createElement, useEffect, useRef, useState, type ClipboardEvent } from "react";
import { Link2, TriangleAlert, X } from "lucide-react";
import { cx } from "@/lib/cx";
import { useEditor } from "./editor-context";

interface EditableTextProps {
  /** Dot-path into SiteContent, e.g. "home.tracks.title". */
  path: string;
  /** Current value — used directly on the public site; used as a fallback
   *  before the first edit inside the editor. */
  value: string;
  as?: string;
  className?: string;
  /** If this text is also a hyperlink, pass the dot-path to its URL. In the
   *  editor a persistent link chip appears and a warned URL editor opens when
   *  the chip is pressed. */
  hrefPath?: string;
  hrefValue?: string;
}

// Selection uses a lighter tint (not the same #3b82f6 as the border) so a
// fully-selected field's fill doesn't visually swallow its own outline. Outline
// WIDTH/STYLE/COLOUR are all applied per-state below (see cx), NOT baked in
// here: two `outline-*` utilities of the same property at equal specificity let
// Tailwind's last-emitted win and the border silently never paints. Emit exactly
// one of each per state (hover: variants outrank the base, so they win on hover).
const EDIT_OUTLINE =
  "rounded-sm outline-offset-2 transition-all duration-150 selection:bg-[#bfdbfe] selection:text-[#1e3a5f]";
// At-rest affordance: a permanent faint dashed accent border marks the field as
// editable; hover/focus/dirty strengthen it to a solid 2px accent.
const OUTLINE_REST =
  "outline-1 outline-dashed outline-[#3b82f6]/35 hover:outline-2 hover:outline-solid hover:outline-[#3b82f6]/70";
const OUTLINE_ACTIVE = "outline-2 outline-solid outline-[#3b82f6] focus-visible:outline-[#3b82f6]";

export default function EditableText({
  path,
  value,
  as = "span",
  className,
  hrefPath,
  hrefValue,
}: EditableTextProps) {
  const { isEditing, getValue, setValue } = useEditor();
  const ref = useRef<HTMLElement | null>(null);
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const [dirty, setDirty] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [pop, setPop] = useState<{ top: number; left: number } | null>(null);
  // Set text ONCE imperatively on mount. Handing content to React (as children)
  // makes it rewrite the text node on every re-render, collapsing the live
  // selection. The contentEditable owns its text while mounted; handleBlur reads
  // it back out. Captured once so it never changes after mount.
  const [initialText] = useState<string>(() => (getValue(path) as string | undefined) ?? value);
  useEffect(() => {
    if (ref.current) ref.current.textContent = initialText;
    // Mount-only: after this the contentEditable owns its own text.
  }, [initialText]);

  if (!isEditing) {
    return createElement(as, { className }, value);
  }

  const current = (getValue(path) as string | undefined) ?? value;

  function handleBlur() {
    const text = ref.current?.innerText ?? "";
    if (text !== current) setValue(path, text);
    setDirty(false);
  }

  function handlePaste(e: ClipboardEvent) {
    e.preventDefault();
    document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
  }

  // Fixed coordinates so the warning popover is never clipped by an ancestor's
  // overflow-hidden (e.g. buttons).
  function openLinkEditor() {
    const r = wrapRef.current?.getBoundingClientRect();
    if (r) setPop({ top: r.bottom + 6, left: Math.min(r.left, window.innerWidth - 300) });
    setLinkOpen(true);
  }

  const element = createElement(as, {
    ref,
    tabIndex: 0,
    className: cx(
      className,
      EDIT_OUTLINE,
      dirty ? OUTLINE_ACTIVE : OUTLINE_REST,
      "cursor-text",
    ),
    // Always editable in editor mode — never toggle contentEditable on a focused
    // element (that blurs it to <body> and kills the selection + border).
    contentEditable: true,
    suppressContentEditableWarning: true,
    onFocus: () => setDirty(true),
    onBlur: handleBlur,
    onPaste: handlePaste,
  });

  if (!hrefPath) return element;

  const currentHref = (getValue(hrefPath) as string | undefined) ?? hrefValue ?? "";

  return (
    <span ref={wrapRef} className="inline-flex items-center gap-1 align-baseline">
      {element}
      <button
        type="button"
        title="This text is a link — click to edit its web address"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (linkOpen) setLinkOpen(false);
          else openLinkEditor();
        }}
        className="inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[#3b82f6] text-white shadow-sm"
      >
        <Link2 size={10} />
      </button>

      {linkOpen && pop && (
        <span
          className="fixed z-[120] w-[280px] rounded-md border border-line bg-surface p-3 text-left normal-case tracking-normal shadow-pop"
          style={{ top: pop.top, left: pop.left }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setLinkOpen(false)}
            className="absolute right-1.5 top-1.5 rounded p-0.5 text-muted hover:bg-surface-2"
          >
            <X size={13} />
          </button>
          <span className="mb-2 mr-5 flex items-start gap-1.5 rounded border border-amber-200 bg-amber-50 px-2 py-1.5 pr-5 text-[0.68rem] leading-snug text-amber-700">
            <TriangleAlert size={12} className="mt-0.5 flex-shrink-0" />
            This text is a link. The web address below decides where it goes — change it carefully.
          </span>
          <label className="mb-1 block text-[0.64rem] font-semibold uppercase tracking-[0.04em] text-muted">
            Web address
          </label>
          <input
            type="text"
            defaultValue={currentHref}
            onBlur={(e) => setValue(hrefPath, e.target.value)}
            placeholder="/courses or https://…"
            className="w-full rounded border border-line px-2 py-1.5 text-[0.78rem] text-ink focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setLinkOpen(false)}
            className="mt-2 w-full rounded bg-ink py-1.5 text-[0.72rem] font-medium text-bg transition-colors hover:bg-accent"
          >
            Done
          </button>
        </span>
      )}
    </span>
  );
}
