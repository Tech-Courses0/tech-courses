"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getPath, setPath } from "@/lib/object-path";
import type { SiteContent } from "@/types/content";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface EditorContextValue {
  isEditing: boolean;
  content: SiteContent;
  getValue: (path: string) => unknown;
  setValue: (path: string, value: unknown) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  saveStatus: SaveStatus;
  publish: (message: string) => Promise<boolean>;
  publishing: boolean;
  published: boolean;
}

const EditorContext = createContext<EditorContextValue | null>(null);

/** Editable* components call this; outside a provider (the public site) it
 *  reports isEditing: false and callers fall back to their static `value`. */
export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (ctx) return ctx;
  return {
    isEditing: false,
    content: null as unknown as SiteContent,
    getValue: () => undefined,
    setValue: () => {},
    undo: () => {},
    redo: () => {},
    canUndo: false,
    canRedo: false,
    saveStatus: "idle",
    publish: async () => false,
    publishing: false,
    published: false,
  };
}

const AUTOSAVE_DELAY_MS = 800;

export function EditorProvider({
  initialContent,
  children,
}: {
  initialContent: SiteContent;
  children: ReactNode;
}) {
  const [history, setHistory] = useState<SiteContent[]>([initialContent]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const content = history[historyIndex];

  const scheduleAutosave = useCallback((next: SiteContent) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/editor/content", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
        setSaveStatus(res.ok ? "saved" : "error");
      } catch {
        setSaveStatus("error");
      }
    }, AUTOSAVE_DELAY_MS);
  }, []);

  const pushContent = useCallback(
    (next: SiteContent) => {
      setHistory((prev) => [...prev.slice(0, historyIndex + 1), next]);
      setHistoryIndex((i) => i + 1);
      scheduleAutosave(next);
    },
    [historyIndex, scheduleAutosave],
  );

  const setValue = useCallback(
    (path: string, value: unknown) => {
      pushContent(setPath(content, path, value));
    },
    [content, pushContent],
  );

  const getValue = useCallback((path: string) => getPath(content, path), [content]);

  const undo = useCallback(() => {
    setHistoryIndex((i) => {
      const next = Math.max(0, i - 1);
      if (next !== i) scheduleAutosave(history[next]);
      return next;
    });
  }, [history, scheduleAutosave]);

  const redo = useCallback(() => {
    setHistoryIndex((i) => {
      const next = Math.min(history.length - 1, i + 1);
      if (next !== i) scheduleAutosave(history[next]);
      return next;
    });
  }, [history, scheduleAutosave]);

  const publish = useCallback(async (message: string) => {
    setPublishing(true);
    try {
      const res = await fetch("/api/editor/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (res.ok) {
        setPublished(true);
        setTimeout(() => setPublished(false), 2500);
      }
      return res.ok;
    } finally {
      setPublishing(false);
    }
  }, []);

  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    }
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [undo, redo]);

  const value = useMemo<EditorContextValue>(
    () => ({
      isEditing: true,
      content,
      getValue,
      setValue,
      undo,
      redo,
      canUndo: historyIndex > 0,
      canRedo: historyIndex < history.length - 1,
      saveStatus,
      publish,
      publishing,
      published,
    }),
    [content, getValue, setValue, undo, redo, historyIndex, history.length, saveStatus, publish, publishing, published],
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}
