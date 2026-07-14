import type { IconKey } from "@/lib/editor-icons";

/** A labelled link — used in the header nav and footer columns. */
export interface NavLink {
  label: string;
  href: string;
}

/** A labelled navigation CTA (button/link with an editable web address). */
export interface CtaLink {
  label: string;
  href: string;
}

/** A homepage "why tech courses" feature card. `icon` is an editor-icon key. */
export interface FeatureItem {
  icon: IconKey;
  title: string;
  body: string;
}

export interface FooterColumn {
  title: string;
  links: NavLink[];
}

/** A credited maintainer, edited only in the Settings drawer (§10 rule A). */
export interface Maintainer {
  name: string;
  role: string;
  link: string;
}

/** One line of the hero terminal mockup. `tone` maps to a colour class
 *  (ink/muted/accent/…); unknown tones fall back to the default colour. */
export interface TerminalLine {
  prompt: string;
  text: string;
  tone: string;
}

/** A homepage stat. The number itself is DB/catalog-derived; `override` (empty
 *  by default) lets the owner pin a display value from Settings. */
export interface StatItem {
  label: string;
  override: string;
}

/** Global brand/identity settings — edited only in the Settings panel, never
 *  inline (§10 rule A). Plain data so it serialises to JSONB. */
export interface SiteConfig {
  wordmark: string;
  badge: string;
  /** Optional logo image; when set it overrides the text badge in the chrome. */
  logo: string | null;
  metaTitle: string;
  metaDescription: string;
}

export interface NavContent {
  links: NavLink[];
  loginLabel: string;
  loginHref: string;
  ctaLabel: string;
  ctaHref: string;
  myLearningLabel: string;
  myLearningHref: string;
}

export interface FooterContent {
  /** Rendered as rich text (a `$` prompt prefix stays as static JSX). */
  tagline: string;
  columns: FooterColumn[];
  eofLabel: string;
  copyright: string;
  buildNote: string;
}

/** The terminal-hero mockup on the homepage. */
export interface HeroContent {
  eyebrow: string;
  headingLead: string;
  headingAccent: string;
  lead: string;
  primaryCta: CtaLink;
  secondaryCta: CtaLink;
  tracksLine: { prefix: string; cert: CtaLink; coding: CtaLink };
  terminal: {
    title: string;
    chip: string;
    lines: TerminalLine[];
    nowPlayingLabel: string;
    continueLabel: string;
    viewsLabel: string;
    loginSync: string;
  };
}

export interface HomeContent {
  hero: HeroContent;
  /** Per-stat labels + optional overrides for the stat strip. */
  stats: StatItem[];
  /** Shown only when there are no published courses to build the terminal hero. */
  heroFallbackLead: string;
  heroFallbackAccent: string;
  heroFallbackCta: string;
  tracks: { index: string; label: string; title: string; subtitle: string; openLabel: string };
  popular: { index: string; label: string; title: string; viewAll: string };
  features: { index: string; label: string; title: string; items: FeatureItem[] };
  instructor: { index: string; label: string; title: string };
  cta: {
    command: string;
    title: string;
    subtitle: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
  };
}

export interface CoursesPageContent {
  dividerLabel: string;
  prompt: string;
  title: string;
  subtitle: string;
}

/** Shared microcopy applied to every generated course card. Card titles,
 *  descriptions and hrefs stay catalog-derived (not here). */
export interface CourseCardMicrocopy {
  freeLabel: string;
  lessonsLabel: string;
  runtimeLabel: string;
  viewsLabel: string;
}

/** Chrome strings for the /courses catalog control bar. Placeholder/tab/sort
 *  strings live in Settings (they're form controls, not inline-editable);
 *  showing/empty strings are edited inline on the page. */
export interface CatalogContent {
  allTracksLabel: string;
  searchPlaceholder: string;
  showingPrefix: string;
  courseWord: string;
  coursesWord: string;
  emptyState: string;
  sortPopular: string;
  sortLessons: string;
  sortAz: string;
}

/** The whole owner-editable content tree. Course catalog, prices, users,
 *  payments and progress are code/DB-owned and deliberately NOT here. */
export interface SiteContent {
  site: SiteConfig;
  nav: NavContent;
  footer: FooterContent;
  home: HomeContent;
  courses: CoursesPageContent;
  /** Per-level header variants for /courses?level=X (the editor's
   *  Certifications / Coding tabs). The unfiltered "All" header stays `courses`. */
  coursesByLevel: { Certification: CoursesPageContent; Coding: CoursesPageContent };
  courseCard: CourseCardMicrocopy;
  catalog: CatalogContent;
  maintainers: Maintainer[];
}
