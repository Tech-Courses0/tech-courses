"use client";

import {
  createElement,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { Bold, Italic, Underline, Link2 } from "lucide-react";
import { cx } from "@/lib/cx";
import { useEditor } from "./editor-context";
import { sanitizeHtml } from "@/lib/sanitize-html";

interface EditableRichTextProps {
  /** Dot-path into SiteContent holding an HTML string. */
  path: string;
  /** Current value — an HTML string (plain text is valid HTML). */
  value: string;
  as?: string;
  className?: string;
}

// See editable-text.tsx for why width/style/colour are per-state, not baked in.
const EDIT_OUTLINE =
  "rounded-sm outline-offset-2 transition-all duration-150 selection:bg-[#bfdbfe] selection:text-[#1e3a5f]";
const OUTLINE_REST =
  "outline-1 outline-dashed outline-[#3b82f6]/35 hover:outline-2 hover:outline-solid hover:outline-[#3b82f6]/70";
const OUTLINE_ACTIVE = "outline-2 outline-solid outline-[#3b82f6] focus-visible:outline-[#3b82f6]";

export default function EditableRichText({ path, value, as = "p", className }: EditableRichTextProps) {
  const { isEditing, getValue, setValue } = useEditor();
  const ref = useRef<HTMLElement | null>(null);
  const savedRange = useRef<Range | null>(null);
  const [dirty, setDirty] = useState(false);
  const [toolbar, setToolbar] = useState<{ top: number; left: number } | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);

  // innerHTML is written imperatively (NOT via React's dangerouslySetInnerHTML,
  // which re-applies on every re-render — even byte-identical — recreating text
  // nodes and collapsing the live selection; showing the toolbar on mouseup is
  // exactly such a re-render). This effect populates the field on mount and
  // re-syncs it when the store value changes externally (undo/redo, revert) —
  // but never while focused (would collapse an active cursor mid-edit; typing
  // itself only changes `current` on blur).
  const current = (getValue(path) as string | undefined) ?? value;
  useEffect(() => {
    if (!ref.current || !isEditing) return;
    if (document.activeElement === ref.current) return;
    const html = sanitizeHtml(current);
    if (ref.current.innerHTML !== html) ref.current.innerHTML = html;
  }, [current, isEditing]);

  // A drag-selection's mouseup often lands outside this element — a local
  // onMouseUp only fires when the target is this element/descendant. A
  // document-level listener catches it wherever it lands; the ref containment
  // check keeps it scoped to selections actually inside this field.
  useEffect(() => {
    if (!dirty) return;
    const onDocMouseUp = () => updateToolbarPosition();
    document.addEventListener("mouseup", onDocMouseUp);
    return () => document.removeEventListener("mouseup", onDocMouseUp);
  }, [dirty]);

  if (!isEditing) {
    const html = sanitizeHtml(value);
    return createElement(as, { className, dangerouslySetInnerHTML: { __html: html } });
  }

  function handleBlur() {
    const html = sanitizeHtml(ref.current?.innerHTML ?? "");
    if (html !== current) setValue(path, html);
    setDirty(false);
    // Delay so a click on the toolbar (link button) still registers before unmount.
    setTimeout(() => setToolbar(null), 150);
  }

  function handlePaste(e: ClipboardEvent) {
    e.preventDefault();
    document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
  }

  function updateToolbarPosition() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setToolbar(null);
      return;
    }
    if (!ref.current || !sel.anchorNode || !ref.current.contains(sel.anchorNode)) return;
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setToolbar(null);
      return;
    }
    setToolbar({ top: rect.top - 42, left: Math.max(8, rect.left) });
  }

  function exec(command: "bold" | "italic" | "underline") {
    return (e: ReactMouseEvent) => {
      e.preventDefault(); // keep the selection alive
      document.execCommand(command);
      setDirty(true);
    };
  }

  function openLinkEditor(e: ReactMouseEvent) {
    e.preventDefault();
    // The <input> steals focus (and the live selection) the moment it mounts —
    // capture the Range now, restore it before running execCommand.
    const sel = window.getSelection();
    savedRange.current = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;
    setLinkOpen(true);
  }

  function applyLink(url: string) {
    if (url && savedRange.current && ref.current) {
      ref.current.focus();
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedRange.current);
      document.execCommand("createLink", false, url);
      setValue(path, sanitizeHtml(ref.current.innerHTML));
    }
    savedRange.current = null;
    setLinkOpen(false);
    setToolbar(null);
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
    contentEditable: true,
    suppressContentEditableWarning: true,
    onFocus: () => setDirty(true),
    onBlur: handleBlur,
    onPaste: handlePaste,
    onMouseUp: updateToolbarPosition,
    onKeyUp: updateToolbarPosition,
  });

  return (
    <>
      {element}
      {toolbar &&
        createPortal(
          <div
            className="fixed z-[120] flex items-center gap-0.5 rounded-md border border-line bg-surface p-1 shadow-pop"
            style={{ top: toolbar.top, left: toolbar.left }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <ToolbarButton title="Bold" onMouseDown={exec("bold")}>
              <Bold size={13} />
            </ToolbarButton>
            <ToolbarButton title="Italic" onMouseDown={exec("italic")}>
              <Italic size={13} />
            </ToolbarButton>
            <ToolbarButton title="Underline" onMouseDown={exec("underline")}>
              <Underline size={13} />
            </ToolbarButton>
            <ToolbarButton title="Link" onMouseDown={openLinkEditor}>
              <Link2 size={13} />
            </ToolbarButton>
            {linkOpen && (
              <span
                className="absolute left-0 top-full mt-1 flex w-[240px] items-center gap-1.5 rounded-md border border-line bg-surface p-2 shadow-pop"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  autoFocus
                  placeholder="https:// or /page"
                  className="flex-1 rounded border border-line px-2 py-1 text-[0.76rem] text-ink focus:border-accent focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applyLink((e.target as HTMLInputElement).value);
                    if (e.key === "Escape") setLinkOpen(false);
                  }}
                  onBlur={(e) => applyLink(e.target.value)}
                />
              </span>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

function ToolbarButton({
  title,
  onMouseDown,
  children,
}: {
  title: string;
  onMouseDown: (e: ReactMouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={onMouseDown}
      className="flex h-7 w-7 items-center justify-center rounded text-muted hover:bg-accent-tint hover:text-accent"
    >
      {children}
    </button>
  );
}
