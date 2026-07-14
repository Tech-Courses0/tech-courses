"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Upload, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { useEditor } from "./editor-context";
import type { Maintainer, StatItem } from "@/types/content";

/** Labeled text input bound to a content dot-path. */
function Field({ label, path, placeholder }: { label: string; path: string; placeholder?: string }) {
  const { getValue, setValue } = useEditor();
  const value = (getValue(path) as string | null | undefined) ?? "";
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.04em] text-muted">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(path, e.target.value)}
        className="rounded border border-line bg-surface px-2 py-1.5 text-[0.82rem] text-ink focus:border-accent focus:outline-none"
      />
    </label>
  );
}

function TextAreaField({ label, path }: { label: string; path: string }) {
  const { getValue, setValue } = useEditor();
  const value = (getValue(path) as string | null | undefined) ?? "";
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.04em] text-muted">{label}</span>
      <textarea
        value={value}
        rows={4}
        onChange={(e) => setValue(path, e.target.value)}
        className="resize-y rounded border border-line bg-surface px-2 py-1.5 text-[0.82rem] leading-relaxed text-ink focus:border-accent focus:outline-none"
      />
    </label>
  );
}

function UploadField({ label, path, hint }: { label: string; path: string; hint?: string }) {
  const { getValue, setValue } = useEditor();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const url = (getValue(path) as string | null | undefined) ?? null;

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/editor/upload", { method: "POST", body: form });
      if (res.ok) setValue(path, (await res.json()).url);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.04em] text-muted">{label}</span>
      <div className="flex items-center gap-2">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-8 w-8 rounded border border-line bg-surface object-contain" />
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 rounded border border-line px-2.5 py-1.5 text-[0.74rem] text-ink hover:bg-surface-2"
        >
          <Upload size={13} /> {busy ? "Uploading…" : url ? "Replace" : "Upload"}
        </button>
        {url && (
          <button type="button" onClick={() => setValue(path, null)} className="text-[0.72rem] text-red-600 hover:underline">
            Remove
          </button>
        )}
      </div>
      {hint && <span className="text-[0.66rem] text-muted">{hint}</span>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <p className="mt-1 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-accent">{children}</p>;
}

/** Optional per-stat number overrides. Empty → the live DB/catalog number shows. */
function StatOverrides() {
  const { getValue } = useEditor();
  const stats = (getValue("home.stats") as StatItem[] | undefined) ?? [];
  return (
    <>
      {stats.map((s, i) => (
        <Field
          key={i}
          label={`${s.label || `Stat ${i + 1}`} — shown number`}
          path={`home.stats.${i}.override`}
          placeholder="Leave empty to use the live number"
        />
      ))}
    </>
  );
}

/** Maintainers credits — a Settings-owned repeater (name / role / link). Rendered
 *  plain in the footer, so this drawer is its only editor (§10 rule A). */
function MaintainersEditor() {
  const { getValue, setValue } = useEditor();
  const items = (getValue("maintainers") as Maintainer[] | undefined) ?? [];
  const commit = (next: Maintainer[]) => setValue("maintainers", next);

  const setField = (i: number, key: keyof Maintainer, val: string) =>
    commit(items.map((m, idx) => (idx === i ? { ...m, [key]: val } : m)));
  const remove = (i: number) => commit(items.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const n = [...items];
    [n[i], n[j]] = [n[j], n[i]];
    commit(n);
  };
  const add = () => commit([...items, { name: "", role: "", link: "" }]);

  const input =
    "rounded border border-line bg-surface px-2 py-1.5 text-[0.82rem] text-ink focus:border-accent focus:outline-none";

  return (
    <div className="flex flex-col gap-3">
      {items.map((m, i) => (
        <div key={i} className="flex flex-col gap-1.5 rounded border border-line p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[0.64rem] font-semibold uppercase tracking-[0.04em] text-muted">#{i + 1}</span>
            <div className="flex items-center gap-0.5">
              <button type="button" title="Move up" onClick={() => move(i, -1)} className="rounded p-1 text-muted hover:bg-surface-2">
                <ChevronUp size={13} />
              </button>
              <button type="button" title="Move down" onClick={() => move(i, 1)} className="rounded p-1 text-muted hover:bg-surface-2">
                <ChevronDown size={13} />
              </button>
              <button type="button" title="Remove" onClick={() => remove(i)} className="rounded p-1 text-red-600 hover:bg-red-50">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
          <input value={m.name} placeholder="Name" onChange={(e) => setField(i, "name", e.target.value)} className={input} />
          <input value={m.role} placeholder="Role (e.g. maintainer)" onChange={(e) => setField(i, "role", e.target.value)} className={input} />
          <input value={m.link} placeholder="https://… (optional)" onChange={(e) => setField(i, "link", e.target.value)} className={input} />
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-[#3b82f6]/30 py-2.5 text-[0.78rem] font-medium text-[#3b82f6] hover:bg-blue-50/60"
      >
        <Plus size={14} /> Add maintainer
      </button>
    </div>
  );
}

export default function SettingsPanel() {
  const { content } = useEditor();
  if (!content) return null;

  return (
    <div className="flex flex-col gap-4">
      <SectionLabel>Brand</SectionLabel>
      <Field label="Wordmark" path="site.wordmark" />
      <Field label="Badge (2 letters)" path="site.badge" />
      <UploadField label="Logo image" path="site.logo" hint="Overrides the text badge in the header/footer when set." />

      <SectionLabel>SEO</SectionLabel>
      <Field label="Meta title" path="site.metaTitle" />
      <TextAreaField label="Meta description" path="site.metaDescription" />

      <SectionLabel>Homepage stats</SectionLabel>
      <p className="text-[0.66rem] leading-relaxed text-muted">
        The four numbers are pulled live from the channel/catalog. Fill a field
        below only to pin a custom value; leave it empty to keep the live number.
      </p>
      <StatOverrides />

      <SectionLabel>Courses page</SectionLabel>
      <Field label="&ldquo;All tracks&rdquo; tab label" path="catalog.allTracksLabel" />
      <Field label="Search box placeholder" path="catalog.searchPlaceholder" />
      <Field label="Sort — most viewed" path="catalog.sortPopular" />
      <Field label="Sort — most lessons" path="catalog.sortLessons" />
      <Field label="Sort — A–Z" path="catalog.sortAz" />

      <SectionLabel>Maintainers</SectionLabel>
      <p className="text-[0.66rem] leading-relaxed text-muted">
        Shown as a credit line in the site footer.
      </p>
      <MaintainersEditor />

      <p className="mt-1 text-[0.68rem] leading-relaxed text-muted">
        These global values change once and propagate everywhere. Course catalog,
        prices and account settings are managed in Course Studio, not here.
      </p>
    </div>
  );
}
