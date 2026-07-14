"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

/** Right-side slide-over used by the Settings panel in the editor. */
export default function EditorDrawer({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 top-12 z-[95] bg-black/10" onClick={onClose} />
      <aside className="fixed bottom-0 right-0 top-12 z-[96] flex w-[320px] flex-col border-l border-line bg-surface shadow-pop">
        <div className="flex h-12 flex-shrink-0 items-center justify-between border-b border-line px-4">
          <span className="font-mono text-[0.82rem] font-bold text-ink">{title}</span>
          <button type="button" onClick={onClose} className="rounded p-1.5 text-muted hover:bg-surface-2">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </>
  );
}
