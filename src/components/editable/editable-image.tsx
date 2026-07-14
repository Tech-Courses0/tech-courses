"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { ImageIcon } from "lucide-react";
import { cx } from "@/lib/cx";
import { useEditor } from "./editor-context";

interface EditableImageProps {
  /** Dot-path into SiteContent, e.g. "site.logo". */
  path: string;
  value: string | null;
  alt: string;
  className?: string;
  placeholderLabel?: string;
}

function Placeholder({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cx(
        "grid place-items-center bg-surface-2 text-[0.6rem] font-mono uppercase tracking-[0.12em] text-muted",
        className,
      )}
    >
      {label}
    </span>
  );
}

export default function EditableImage({
  path,
  value,
  alt,
  className,
  placeholderLabel = "Image",
}: EditableImageProps) {
  const { isEditing, getValue, setValue } = useEditor();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Tailwind's group-hover variant doesn't reliably compile under this project's
  // Turbopack pipeline — track hover in JS state instead.
  const [hovered, setHovered] = useState(false);

  const current = isEditing ? ((getValue(path) as string | null | undefined) ?? value) : value;
  const src = previewUrl ?? current;

  if (!isEditing) {
    return src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={className} />
    ) : (
      <Placeholder label={placeholderLabel} className={className} />
    );
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("That's not an image file.");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image is too large — use a file under 5 MB.");
      e.target.value = "";
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/editor/upload", { method: "POST", body: form });
      if (res.ok) {
        setValue(path, (await res.json()).url);
      } else {
        const { error: msg } = await res.json().catch(() => ({ error: "Upload failed." }));
        setError(msg ?? "Upload failed.");
      }
    } finally {
      setUploading(false);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      e.target.value = "";
    }
  }

  return (
    <span
      className={cx("relative inline-flex overflow-hidden", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <Placeholder label={placeholderLabel} className="h-full w-full" />
      )}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cx(
          "absolute inset-0 flex items-center justify-center gap-1.5 text-xs font-semibold text-white transition-all duration-150",
          hovered ? "bg-black/45 opacity-100" : "bg-black/0 opacity-0",
        )}
      >
        <ImageIcon size={15} aria-hidden="true" />
        {uploading ? "Uploading…" : "Change"}
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {error && (
        <span className="absolute inset-x-0 bottom-0 z-10 bg-red-600 px-2 py-1 text-center text-[0.62rem] leading-tight text-white">
          {error}
        </span>
      )}
    </span>
  );
}
