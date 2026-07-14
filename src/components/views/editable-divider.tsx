import EditableText from "@/components/editable/editable-text";

/** Same structure as AsciiDivider, but the index + label are inline-editable
 *  inside the CMS editor (plain text on the public site). */
export function EditableDivider({
  indexPath,
  index,
  labelPath,
  label,
  className = "",
}: {
  indexPath?: string;
  index?: string;
  labelPath: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={`flex select-none items-center gap-3 ${className}`}>
      {index !== undefined && (
        <span className="section-marker">
          <b>{indexPath ? <EditableText path={indexPath} value={index} /> : index}</b>
        </span>
      )}
      <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
        {"// "}
        <EditableText path={labelPath} value={label} />
      </span>
      <span className="ascii ascii-dim min-w-0 flex-1 overflow-hidden whitespace-nowrap" aria-hidden>
        {"─".repeat(600)}
      </span>
    </div>
  );
}
