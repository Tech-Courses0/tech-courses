"use client";

import Link from "next/link";
import { Fragment } from "react";
import { usePathname } from "next/navigation";
import EditableText from "./editable/editable-text";
import EditableRichText from "./editable/editable-rich-text";
import EditableImage from "./editable/editable-image";
import EditableRepeater from "./editable/editable-repeater";
import { EditableDivider } from "./views/editable-divider";
import type { SiteContent, FooterColumn, NavLink } from "@/types/content";
import { defaultContent } from "@/lib/content-defaults";

export function SiteFooter({ content, editor = false }: { content?: SiteContent; editor?: boolean }) {
  const pathname = usePathname();
  if (!editor && (pathname?.startsWith("/learn/") || pathname?.startsWith("/admin/editor"))) return null;

  const c = content ?? defaultContent();
  const { site, footer } = c;

  return (
    <footer className="relative mt-24 border-t border-line bg-surface">
      <div className="container-page pt-10">
        <EditableDivider labelPath="footer.eofLabel" label={footer.eofLabel} />
      </div>
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div>
          <div className="flex items-center gap-2.5">
            {site.logo ? (
              <EditableImage path="site.logo" value={site.logo} alt={site.wordmark} className="h-8 w-8 rounded-[var(--radius-sm)]" />
            ) : (
              <span className="metal grid h-8 w-8 place-items-center rounded-[var(--radius-sm)] font-mono text-sm font-bold">
                <EditableText path="site.badge" value={site.badge} as="span" />
              </span>
            )}
            <span className="font-mono text-[0.95rem] font-bold tracking-tight text-ink">
              <EditableText path="site.wordmark" value={site.wordmark} as="span" />
            </span>
          </div>
          <p className="mt-4 max-w-xs font-mono text-xs leading-relaxed text-muted">
            <span className="text-line-strong">$</span>{" "}
            <EditableRichText path="footer.tagline" value={footer.tagline} as="span" className="inline" />
          </p>
        </div>

        <EditableRepeater<FooterColumn>
          path="footer.columns"
          items={footer.columns}
          addLabel="Add column"
          newItem={() => ({ title: "new", links: [{ label: "link", href: "/" }] })}
          renderItem={(col, ci) => (
            <div>
              <h4 className="mono-label uppercase tracking-[0.16em]">
                {"// "}
                <EditableText path={`footer.columns.${ci}.title`} value={col.title} as="span" />
              </h4>
              <ul className="mt-4 space-y-2.5">
                <EditableRepeater<NavLink>
                  path={`footer.columns.${ci}.links`}
                  items={col.links}
                  addLabel="Add link"
                  newItem={() => ({ label: "new link", href: "/" })}
                  renderItem={(l, li) => (
                    <li>
                      <Link href={l.href} className="link-draw font-mono text-sm text-ink-soft transition-colors hover:text-accent">
                        <EditableText
                          path={`footer.columns.${ci}.links.${li}.label`}
                          value={l.label}
                          as="span"
                          hrefPath={`footer.columns.${ci}.links.${li}.href`}
                          hrefValue={l.href}
                        />
                      </Link>
                    </li>
                  )}
                />
              </ul>
            </div>
          )}
        />
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 font-mono text-xs text-muted sm:flex-row">
          <p>
            <span className="text-accent">●</span> © {new Date().getFullYear()}{" "}
            <EditableText path="footer.copyright" value={footer.copyright} as="span" />
          </p>
          {/* Maintainers are Settings-owned (§10 rule A) — rendered plain here, no
              inline editor; edited in the editor's Settings drawer. */}
          {c.maintainers.length > 0 && (
            <p className="order-last sm:order-none">
              maintained by{" "}
              {c.maintainers.map((m, i) => (
                <Fragment key={i}>
                  {i > 0 && ", "}
                  {m.link ? (
                    <a href={m.link} target="_blank" rel="noreferrer" className="link-draw text-ink-soft transition-colors hover:text-accent">
                      {m.name}
                    </a>
                  ) : (
                    <span className="text-ink-soft">{m.name}</span>
                  )}
                  {m.role ? ` (${m.role})` : ""}
                </Fragment>
              ))}
            </p>
          )}
          <p className="text-line-strong">
            build: <span className="text-accent">ok</span> ·{" "}
            <EditableText path="footer.buildNote" value={footer.buildNote} as="span" />
          </p>
        </div>
      </div>
    </footer>
  );
}
