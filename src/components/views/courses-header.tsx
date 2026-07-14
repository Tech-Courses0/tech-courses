import EditableText from "@/components/editable/editable-text";
import { EditableDivider } from "./editable-divider";
import type { CoursesPageContent } from "@/types/content";

/** The editable header block at the top of /courses. Reused verbatim inside the
 *  CMS editor's Courses / Certifications / Coding tabs — each fed its own content
 *  block and `basePath` (e.g. "courses" or "coursesByLevel.Certification") so the
 *  inline edits write to the matching part of the tree. */
export function CoursesHeader({
  header,
  basePath,
}: {
  header: CoursesPageContent;
  basePath: string;
}) {
  return (
    <section className="border-b border-line bg-surface/70">
      <div className="container-page py-12">
        <EditableDivider index="ls" labelPath={`${basePath}.dividerLabel`} label={header.dividerLabel} />
        <p className="mt-5 font-mono text-xs text-muted">
          <span className="term-prompt text-accent" />
          <EditableText path={`${basePath}.prompt`} value={header.prompt} as="span" />
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink md:text-4xl">
          <EditableText path={`${basePath}.title`} value={header.title} as="span" />
        </h1>
        <p className="mt-3 max-w-2xl text-ink-soft">
          <EditableText path={`${basePath}.subtitle`} value={header.subtitle} as="span" />
        </p>
      </div>
    </section>
  );
}
