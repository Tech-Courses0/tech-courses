import { getDraftContent } from "@/lib/site-content";
import { getCourses, getChannelStats, getInstructorWithStats } from "@/lib/catalog";
import EditorShell from "./EditorShell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Website Editor" };

export default async function EditorPage() {
  const [content, courses, channelStats, instructor] = await Promise.all([
    getDraftContent(),
    getCourses(),
    getChannelStats(),
    getInstructorWithStats(),
  ]);

  const heroCourse = [...courses].sort((a, b) => b.views - a.views)[0];

  return (
    <EditorShell
      initialContent={content}
      courses={courses}
      channelStats={channelStats}
      instructor={instructor}
      heroCourse={heroCourse}
      heroProgress={0}
      heroHref={heroCourse ? `/courses/${heroCourse.slug}` : "/courses"}
      isAuthed={false}
    />
  );
}
