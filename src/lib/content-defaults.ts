import type { SiteContent } from "@/types/content";

/**
 * Seed content — the site's current hardcoded strings, unchanged. This is what
 * the public UI renders before the first edit and what `Revert to original`
 * resets to. Course catalog / prices / users live in the DB and are NOT here.
 */
export function defaultContent(): SiteContent {
  return {
    site: {
      wordmark: "tech-courses",
      badge: "TC",
      logo: null,
      metaTitle:
        "Tech Courses Academy · Free NISM Certification & Coding courses",
      metaDescription:
        "Free, structured video courses for India's NISM securities-market certifications and competitive coding — from the Tech Courses channel. Learn at your own pace with progress tracking.",
    },
    nav: {
      links: [
        { label: "courses", href: "/courses" },
        { label: "certifications", href: "/courses?level=Certification" },
        { label: "coding", href: "/courses?level=Coding" },
        { label: "contact", href: "/contact" },
      ],
      loginLabel: "log in",
      loginHref: "/login",
      ctaLabel: "get started",
      ctaHref: "/signup",
      myLearningLabel: "my learning",
      myLearningHref: "/dashboard",
    },
    footer: {
      tagline:
        "free, structured video courses for India's NISM securities-market certifications and competitive coding — from the Tech Courses channel.",
      columns: [
        {
          title: "learn",
          links: [
            { label: "all courses", href: "/courses" },
            { label: "nism certifications", href: "/courses?level=Certification" },
            { label: "coding & dsa", href: "/courses?level=Coding" },
          ],
        },
        {
          title: "platform",
          links: [
            { label: "my learning", href: "/dashboard" },
            { label: "instructor studio", href: "/admin" },
            { label: "browse courses", href: "/courses" },
          ],
        },
        {
          title: "company",
          links: [
            { label: "about us", href: "/" },
            { label: "contact", href: "/contact" },
            { label: "terms & privacy", href: "/" },
          ],
        },
      ],
      eofLabel: "eof",
      copyright:
        "tech courses academy · course videos © tech courses · educational use",
      buildNote: "nism + coding · free",
    },
    home: {
      hero: {
        eyebrow: "status: online · 2 tracks · 100% free",
        headingLead: "Compile your",
        headingAccent: "career.",
        lead: "Structured, chapter-by-chapter video courses for India's NISM securities certifications and competitive programming — free, self-paced, and built to finish.",
        primaryCta: { label: "explore courses", href: "/courses" },
        secondaryCta: { label: "start free", href: "/signup" },
        tracksLine: {
          prefix: "two tracks —",
          cert: { label: "nism certifications", href: "/courses?level=Certification" },
          coding: { label: "coding & dsa", href: "/courses?level=Coding" },
        },
        terminal: {
          title: "tech-courses@academy: ~/learn",
          chip: "zsh",
          lines: [
            { prompt: "❯", text: "tc init --tracks all", tone: "ink" },
            { prompt: "", text: "resolving catalog …", tone: "muted" },
            { prompt: "", text: "channel @techcourses4u …", tone: "muted" },
            { prompt: "❯", text: "tc start --free", tone: "ink" },
            { prompt: "", text: "ready. no paywall. self-paced.", tone: "accent" },
          ],
          nowPlayingLabel: "now playing",
          continueLabel: "continue",
          viewsLabel: "views",
          loginSync: "log in to sync progress",
        },
      },
      stats: [
        { label: "subscribers", override: "" },
        { label: "courses", override: "" },
        { label: "lessons", override: "" },
        { label: "total views", override: "" },
      ],
      heroFallbackLead: "Compile your",
      heroFallbackAccent: "career.",
      heroFallbackCta: "explore courses",
      tracks: {
        index: "01",
        label: "choose your track",
        title: "Two tracks, one channel.",
        subtitle:
          "Pick a path and follow it chapter by chapter — or run both in parallel.",
        openLabel: "open",
      },
      popular: {
        index: "02",
        label: "most-watched",
        title: "Courses students actually finish.",
        viewAll: "view all",
      },
      features: {
        index: "03",
        label: "why tech courses",
        title: "Built to get you certified — and job-ready.",
        items: [
          {
            icon: "book-open",
            title: "Structured, chapter by chapter",
            body: "Every NISM series and coding topic is laid out in order, so you always know exactly what to study next.",
          },
          {
            icon: "play-circle",
            title: "Learn at your own pace",
            body: "Stream lessons, pause, rewind and revise. Your place is saved across devices, lesson by lesson.",
          },
          {
            icon: "gift",
            title: "Completely free",
            body: "The full catalog is free — no paywalls. Every course mirrors the Tech Courses YouTube channel.",
          },
          {
            icon: "shield-check",
            title: "Exam- and interview-focused",
            body: "From NISM exam prep to LeetCode patterns, the content is built to pass certifications and crack interviews.",
          },
        ],
      },
      instructor: {
        index: "04",
        label: "maintainer",
        title: "Behind the channel.",
      },
      cta: {
        command: "tc signup --free",
        title: "Start learning today — free.",
        subtitle:
          "Create a free account to track your progress across courses, or jump straight into any lesson.",
        primaryLabel: "create free account",
        primaryHref: "/signup",
        secondaryLabel: "browse courses",
        secondaryHref: "/courses",
      },
    },
    courses: {
      dividerLabel: "catalog",
      prompt: "tc ls --tracks all",
      title: "Explore courses",
      subtitle:
        "Every NISM certification and coding course from the Tech Courses channel. Filter by track, search by topic, and start watching free.",
    },
    coursesByLevel: {
      Certification: {
        dividerLabel: "catalog",
        prompt: "tc ls --level Certification",
        title: "NISM Certifications",
        subtitle:
          "Structured, chapter-by-chapter prep for India's NISM securities-market certification exams — free and self-paced.",
      },
      Coding: {
        dividerLabel: "catalog",
        prompt: "tc ls --level Coding",
        title: "Coding & DSA",
        subtitle:
          "From the C language to data structures, algorithms and interview patterns — competitive programming, built to finish.",
      },
    },
    courseCard: {
      freeLabel: "free",
      lessonsLabel: "lessons",
      runtimeLabel: "runtime",
      viewsLabel: "views",
    },
    catalog: {
      allTracksLabel: "all tracks",
      searchPlaceholder: "Search courses, e.g. NISM, LeetCode, C",
      showingPrefix: "showing",
      courseWord: "course",
      coursesWord: "courses",
      emptyState: "No courses match your search. Try a different keyword or level.",
      sortPopular: "Most viewed",
      sortLessons: "Most lessons",
      sortAz: "A–Z",
    },
    maintainers: [
      { name: "Tech Courses", role: "maintainer", link: "https://youtube.com/@techcourses4u" },
    ],
  };
}
