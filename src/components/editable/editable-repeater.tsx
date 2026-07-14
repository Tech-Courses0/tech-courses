"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Copy, Trash2, Plus, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { cx } from "@/lib/cx";
import { useEditor } from "./editor-context";

interface EditableRepeaterProps<T> {
  /** Dot-path into SiteContent for this array, e.g. "nav.links". */
  path: string;
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  newItem: () => T;
  /** Static classes for every item, or a per-item function. */
  itemClassName?: string | ((item: T, index: number) => string);
  addLabel?: string;
  allowAdd?: boolean;
  allowDuplicate?: boolean;
}

/** Renders `items.map(renderItem)` untouched when not editing. Inside the
 *  editor, wraps each item with duplicate/delete/reorder controls (revealed on
 *  click-to-select) and appends an "add" control — driven off `path` in the
 *  shared draft content. */
export default function EditableRepeater<T>({
  path,
  items,
  renderItem,
  newItem,
  itemClassName,
  addLabel = "Add",
  allowAdd = true,
  allowDuplicate = true,
}: EditableRepeaterProps<T>) {
  const { isEditing, getValue, setValue } = useEditor();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  // Click-to-select drives the control bar (not CSS hover, which under this
  // project's Turbopack pipeline is unreliable, and would fire link navigation
  // on the revealing click). Track the selected item's stable id, not its array
  // position, so the bar follows an item across a reorder.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  // `draggable` only arms while the mouse is down on the grip handle, so text
  // selection inside an EditableText isn't hijacked as a drag.
  const [armedIndex, setArmedIndex] = useState<number | null>(null);
  // Stable per-item keys, independent of array position: EditableText sets its
  // DOM text imperatively once per mount, so keying by index would leave a moved
  // item's node showing its old text. Keying by a stable id makes React actually
  // move the node on reorder. Kept in state (not a ref) so it can be read during
  // render; reordered alongside content in the mutation handlers below.
  const [ids, setIds] = useState<string[]>(() => items.map(() => crypto.randomUUID()));

  // The mutation handlers below keep `ids` in lockstep with the array. External
  // length changes (undo/redo, revert) fall back to index-based keys for any
  // overflow index (`ids[i] ?? …`), which is fine — those are whole-tree
  // replacements, not in-place reorders where stable keys matter.
  const current = (getValue(path) as T[] | undefined) ?? items;

  useEffect(() => {
    if (selectedId === null) return;
    function onDocMouseDown(e: MouseEvent) {
      const insideSome = itemRefs.current.some((el) => el && el.contains(e.target as Node));
      if (!insideSome) setSelectedId(null);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [selectedId]);

  if (!isEditing) {
    return (
      <>
        {items.map((item, i) => (
          <Fragment key={i}>{renderItem(item, i)}</Fragment>
        ))}
      </>
    );
  }

  function commit(next: T[]) {
    setValue(path, next);
  }

  function duplicate(i: number) {
    const next = [...current];
    next.splice(i + 1, 0, structuredClone(current[i]));
    setIds((prev) => {
      const n = [...prev];
      n.splice(i + 1, 0, crypto.randomUUID());
      return n;
    });
    commit(next);
  }

  function remove(i: number) {
    commit(current.filter((_, idx) => idx !== i));
    setIds((prev) => prev.filter((_, idx) => idx !== i));
    setSelectedId(null);
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= current.length) return;
    const next = [...current];
    [next[i], next[j]] = [next[j], next[i]];
    setIds((prev) => {
      const n = [...prev];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
    commit(next);
  }

  function onDrop(i: number) {
    if (dragIndex === null || dragIndex === i) return;
    const next = [...current];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(i, 0, moved);
    setIds((prev) => {
      const n = [...prev];
      const [movedId] = n.splice(dragIndex, 1);
      n.splice(i, 0, movedId);
      return n;
    });
    commit(next);
    setDragIndex(null);
  }

  function add() {
    setIds((prev) => [...prev, crypto.randomUUID()]);
    commit([...current, newItem()]);
  }

  return (
    <>
      {current.map((item, i) => {
        const id = ids[i] ?? `i${i}`;
        const selected = selectedId === id;
        return (
          <div
            key={id}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            className={cx(
              "relative",
              typeof itemClassName === "function" ? itemClassName(item, i) : itemClassName,
            )}
            draggable={armedIndex === i}
            onClickCapture={(e) => {
              // Selecting an item must never fire real navigation.
              if ((e.target as HTMLElement).closest("a")) e.preventDefault();
            }}
            onClick={() => setSelectedId(id)}
            onDragStart={() => setDragIndex(i)}
            onDragEnd={() => setArmedIndex(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(i)}
          >
            {/* Hangs off the item's bottom edge, centred — never inset over its
                own content (avoids z-index collisions with the fixed toolbar and
                spilling into a neighbour). */}
            <div
              className={cx(
                "absolute left-1/2 top-full z-20 flex -translate-x-1/2 items-center gap-0.5 rounded-md border border-[#3b82f6]/40 bg-surface p-0.5 shadow-md transition-opacity duration-150",
                selected ? "opacity-100" : "pointer-events-none opacity-0",
              )}
            >
              <button type="button" title="Move up" onClick={() => move(i, -1)} className="rounded p-1 text-muted hover:bg-accent-tint">
                <ChevronUp size={13} />
              </button>
              <button type="button" title="Move down" onClick={() => move(i, 1)} className="rounded p-1 text-muted hover:bg-accent-tint">
                <ChevronDown size={13} />
              </button>
              {allowDuplicate && (
                <button type="button" title="Duplicate" onClick={() => duplicate(i)} className="rounded p-1 text-muted hover:bg-accent-tint">
                  <Copy size={13} />
                </button>
              )}
              <button type="button" title="Delete" onClick={() => remove(i)} className="rounded p-1 text-red-600 hover:bg-red-50">
                <Trash2 size={13} />
              </button>
              <span
                title="Drag to reorder"
                className="cursor-grab p-1 text-muted"
                onMouseDown={() => setArmedIndex(i)}
                onMouseUp={() => setArmedIndex(null)}
              >
                <GripVertical size={13} />
              </span>
            </div>
            <div
              className={cx(
                "rounded-sm outline outline-1 outline-dashed",
                selected ? "outline-[#3b82f6]/40" : "outline-transparent",
              )}
            >
              {renderItem(item, i)}
            </div>
          </div>
        );
      })}
      {allowAdd && (
        <button
          type="button"
          onClick={add}
          className={cx(
            "flex items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-[#3b82f6]/30 py-4 text-sm font-medium text-[#3b82f6] transition-colors hover:bg-blue-50/60",
            typeof itemClassName === "function" ? undefined : itemClassName,
          )}
        >
          <Plus size={15} /> {addLabel}
        </button>
      )}
    </>
  );
}
