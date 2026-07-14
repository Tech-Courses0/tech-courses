"use client";

import { createElement, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cx } from "@/lib/cx";
import { useEditor } from "./editor-context";
import { getIcon, iconMap, ICON_KEYS, type IconKey } from "@/lib/editor-icons";

interface IconFieldProps {
  /** Dot-path to the item's icon key, e.g. "home.features.items.0.icon". */
  path: string;
  value?: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

/** Renders the resolved icon. On the public site it's just the icon; inside the
 *  editor it becomes a click target opening a grid of the curated set
 *  (editor-icons). Unknown/missing keys resolve to the fallback. */
export default function IconField({ path, value, size = 16, className, strokeWidth }: IconFieldProps) {
  const { isEditing, getValue, setValue } = useEditor();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  const key = (getValue(path) as string | undefined) ?? value;
  // createElement (not `const Icon = …; <Icon/>`) so the dynamically-resolved
  // component doesn't trip react-hooks/static-components.
  const renderIcon = () =>
    createElement(getIcon(key), { size, strokeWidth, className, "aria-hidden": true });

  useEffect(() => {
    if (!open) return;
    function onDocDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open]);

  if (!isEditing) return renderIcon();

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (open) {
      setOpen(false);
      return;
    }
    const r = ref.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 6, left: Math.max(8, r.left) });
    setOpen(true);
  }

  function pick(k: IconKey) {
    setValue(path, k);
    setOpen(false);
  }

  return (
    <span
      ref={ref}
      role="button"
      tabIndex={0}
      title="Change icon"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={toggle}
      className="relative inline-flex cursor-pointer rounded-sm outline outline-1 outline-dashed outline-offset-2 outline-[#3b82f6]/40 hover:outline-[#3b82f6]"
    >
      {renderIcon()}
      {open &&
        pos &&
        createPortal(
          <div
            className="fixed z-[130] grid w-[232px] grid-cols-6 gap-1 rounded-md border border-line bg-surface p-2 shadow-pop"
            style={{ top: pos.top, left: pos.left }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {ICON_KEYS.map((k) => {
              const Opt = iconMap[k];
              const active = k === key;
              return (
                <button
                  key={k}
                  type="button"
                  title={k}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    pick(k);
                  }}
                  className={cx(
                    "flex h-8 w-8 items-center justify-center rounded",
                    active ? "bg-accent text-accent-ink" : "text-ink-soft hover:bg-accent-tint hover:text-accent",
                  )}
                >
                  <Opt size={16} aria-hidden="true" />
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </span>
  );
}
