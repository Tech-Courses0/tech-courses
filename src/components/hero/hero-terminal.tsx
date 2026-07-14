"use client";

import Link from "next/link";
import { formatCompact } from "@/lib/format";
import { TerminalWindow } from "@/components/terminal/terminal-window";
import { Typewriter, type TypeLine } from "@/components/terminal/typewriter";
import { ScrambleText } from "@/components/terminal/scramble-text";
import { ArrowRightIcon } from "@/components/icons";
import EditableText from "@/components/editable/editable-text";
import EditableRepeater from "@/components/editable/editable-repeater";
import { useEditor } from "@/components/editable/editor-context";
import type { HeroContent, TerminalLine } from "@/types/content";
import type { Tone } from "@/components/ascii/ascii-block";

export interface HeroData {
  hero: HeroContent;
  title: string;
  level: string;
  code: string;
  views: number;
  href: string;
  progress: number;
  isAuthed: boolean;
}

// Line-tone → colour class (mirror of Typewriter's map); unknown tones fall back.
const TONE: Record<string, string> = {
  default: "text-ink-soft",
  dim: "text-line-strong",
  muted: "text-muted",
  accent: "text-accent",
  ink: "text-ink",
};

function asciiBar(pct: number, width = 14): string {
  const filled = Math.round((Math.min(100, Math.max(0, pct)) / 100) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

export function HeroTerminal({ hero, title, level, code, views, href, progress, isAuthed }: HeroData) {
  const { isEditing } = useEditor();
  const t = hero.terminal;
  const nowLabel = progress > 0 ? t.continueLabel : t.nowPlayingLabel;
  const nowLabelPath = progress > 0
    ? "home.hero.terminal.continueLabel"
    : "home.hero.terminal.nowPlayingLabel";

  const typedLines: TypeLine[] = t.lines.map((l) => ({
    prompt: l.prompt,
    text: l.text,
    tone: (l.tone as Tone) ?? "default",
  }));

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
      {/* Left: headline */}
      <div>
        <p className="eyebrow inline-flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
          <EditableText path="home.hero.eyebrow" value={hero.eyebrow} as="span" />
        </p>

        <h1 className="mt-5 text-[clamp(2.6rem,7vw,4.6rem)] font-bold leading-[0.98] tracking-[-0.04em] text-ink">
          <span className="block">
            <EditableText path="home.hero.headingLead" value={hero.headingLead} as="span" />
          </span>
          {isEditing ? (
            <EditableText path="home.hero.headingAccent" value={hero.headingAccent} as="span" className="block text-accent" />
          ) : (
            <ScrambleText as="span" text={hero.headingAccent} trigger="mount" className="block text-accent caret" />
          )}
        </h1>

        <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-soft">
          <EditableText path="home.hero.lead" value={hero.lead} as="span" />
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={hero.primaryCta.href} className="btn btn-primary">
            <EditableText path="home.hero.primaryCta.label" value={hero.primaryCta.label} as="span" hrefPath="home.hero.primaryCta.href" hrefValue={hero.primaryCta.href} />
            <ArrowRightIcon width={16} height={16} />
          </Link>
          <Link href={hero.secondaryCta.href} className="btn btn-outline">
            <EditableText path="home.hero.secondaryCta.label" value={hero.secondaryCta.label} as="span" hrefPath="home.hero.secondaryCta.href" hrefValue={hero.secondaryCta.href} />
          </Link>
        </div>

        <p className="mt-6 font-mono text-xs text-muted">
          <span className="text-line-strong">$</span>{" "}
          <EditableText path="home.hero.tracksLine.prefix" value={hero.tracksLine.prefix} as="span" />{" "}
          <Link href={hero.tracksLine.cert.href} className="link-draw text-ink-soft">
            <EditableText path="home.hero.tracksLine.cert.label" value={hero.tracksLine.cert.label} as="span" hrefPath="home.hero.tracksLine.cert.href" hrefValue={hero.tracksLine.cert.href} />
          </Link>{" "}
          ·{" "}
          <Link href={hero.tracksLine.coding.href} className="link-draw text-ink-soft">
            <EditableText path="home.hero.tracksLine.coding.label" value={hero.tracksLine.coding.label} as="span" hrefPath="home.hero.tracksLine.coding.href" hrefValue={hero.tracksLine.coding.href} />
          </Link>
        </p>
      </div>

      {/* Right: terminal + "now playing" course (course data is catalog-derived) */}
      <TerminalWindow
        title={<EditableText path="home.hero.terminal.title" value={t.title} as="span" />}
        chip={<EditableText path="home.hero.terminal.chip" value={t.chip} as="span" />}
        className="shadow-md"
        bodyClassName="p-4 sm:p-5"
      >
        {isEditing ? (
          <div className="ascii text-[0.8rem] sm:text-[0.84rem]">
            <EditableRepeater<TerminalLine>
              path="home.hero.terminal.lines"
              items={t.lines}
              addLabel="Add line"
              newItem={() => ({ prompt: "❯", text: "new command", tone: "ink" })}
              renderItem={(l, i) => (
                <div className="flex min-h-[1.5em] items-start">
                  {l.prompt ? <span className="mr-2 shrink-0 text-accent">{l.prompt}</span> : null}
                  <EditableText
                    path={`home.hero.terminal.lines.${i}.text`}
                    value={l.text}
                    as="span"
                    className={TONE[l.tone] ?? TONE.default}
                  />
                </div>
              )}
            />
          </div>
        ) : (
          <Typewriter lines={typedLines} className="text-[0.8rem] sm:text-[0.84rem]" />
        )}

        <Link
          href={href}
          className="group mt-5 block rounded-[var(--radius)] border border-line bg-surface-2/60 p-3.5 transition-colors hover:border-line-strong"
        >
          <div className="mono-label flex items-center justify-between">
            <span className="term-prompt text-accent">
              <EditableText path={nowLabelPath} value={nowLabel} as="span" />
            </span>
            <span className="tnum">
              {formatCompact(views)}{" "}
              <EditableText path="home.hero.terminal.viewsLabel" value={t.viewsLabel} as="span" />
            </span>
          </div>
          <p className="mt-1.5 line-clamp-1 font-mono text-sm font-medium text-ink">
            {title}
          </p>
          <p className="mono-label mt-0.5">
            {level} {code ? `· ${code}` : ""}
          </p>
          {isAuthed ? (
            <p className="mt-2 font-mono text-xs">
              <span className="text-accent">{asciiBar(progress)}</span>{" "}
              <span className="tnum text-muted">{progress}%</span>
            </p>
          ) : (
            <p className="mt-2 font-mono text-xs text-muted">
              <span className="text-line-strong">❯</span>{" "}
              <EditableText path="home.hero.terminal.loginSync" value={t.loginSync} as="span" />
              <span className="text-accent">_</span>
            </p>
          )}
        </Link>
      </TerminalWindow>
    </div>
  );
}
