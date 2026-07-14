"use client";

import { useState } from "react";
import { EditorProvider } from "@/components/editable/editor-context";
import EditorToolbar from "@/components/editable/editor-toolbar";
import EditorDrawer from "@/components/editable/editor-drawer";
import SettingsPanel from "@/components/editable/settings-panel";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HomeView, type HomeViewProps } from "@/components/views/home-view";
import { CoursesHeader } from "@/components/views/courses-header";
import { CourseCatalog } from "@/components/course-catalog";
import type { CourseLevel } from "@/lib/types";
import type { SiteContent } from "@/types/content";

// Certifications / Coding are /courses?level=X variants sharing the courses view,
// each fed its own header block + a card list pre-filtered to that level.
const PAGES = [
  { id: "home", label: "Home" },
  { id: "courses", label: "Courses", level: "All", basePath: "courses" },
  { id: "certifications", label: "Certifications", level: "Certification", basePath: "coursesByLevel.Certification" },
  { id: "coding", label: "Coding", level: "Coding", basePath: "coursesByLevel.Coding" },
] as const;

type EditorShellProps = {
  initialContent: SiteContent;
} & Omit<HomeViewProps, "home" | "courseCard">;

export default function EditorShell({ initialContent, ...pageData }: EditorShellProps) {
  const [page, setPage] = useState<string>("home");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const active = PAGES.find((p) => p.id === page) ?? PAGES[0];

  function coursesView(tab: Extract<(typeof PAGES)[number], { level: string }>) {
    const header =
      tab.level === "All" ? initialContent.courses : initialContent.coursesByLevel[tab.level as CourseLevel];
    const list =
      tab.level === "All" ? pageData.courses : pageData.courses.filter((c) => c.level === tab.level);
    return (
      <>
        <CoursesHeader header={header} basePath={tab.basePath} />
        <section className="container-page py-10">
          <CourseCatalog
            initialLevel={tab.level}
            courses={list}
            catalog={initialContent.catalog}
            microcopy={initialContent.courseCard}
          />
        </section>
      </>
    );
  }

  return (
    <EditorProvider initialContent={initialContent}>
      <EditorToolbar
        pages={PAGES.map((p) => ({ id: p.id, label: p.label }))}
        activePage={page}
        onPageChange={setPage}
        settingsOpen={settingsOpen}
        onSettingsToggle={() => setSettingsOpen((v) => !v)}
      />
      <div
        className="pt-12"
        // Inside the editor, clicking any link must NOT navigate — you edit in
        // place and switch pages via the toolbar tabs. Also lets the link-edit
        // chips work without triggering their parent link.
        onClickCapture={(e) => {
          const anchor = (e.target as HTMLElement).closest("a[href]");
          if (anchor) e.preventDefault();
        }}
      >
        <SiteHeader content={initialContent} editor />
        {page === "home" ? (
          <HomeView home={initialContent.home} courseCard={initialContent.courseCard} {...pageData} />
        ) : (
          "level" in active && coursesView(active)
        )}
        <SiteFooter content={initialContent} editor />
      </div>

      <EditorDrawer title="Settings" open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <SettingsPanel />
      </EditorDrawer>
    </EditorProvider>
  );
}
