import { getCourses, getChannelStats, getInstructorWithStats } from "@/lib/catalog";
import { getCurrentUser, getUserEnrollments } from "@/lib/auth";
import { getLiveContent } from "@/lib/site-content";
import { HomeView } from "@/components/views/home-view";

// Published content must show up without a redeploy, so this route can't be
// statically baked at build time.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [content, courses, channelStats, instructor, sessionUser] = await Promise.all([
    getLiveContent(),
    getCourses(),
    getChannelStats(),
    getInstructorWithStats(),
    getCurrentUser(),
  ]);

  const userEnrollments = sessionUser ? await getUserEnrollments(sessionUser.id) : [];

  // Hero pane: user's most-recently-enrolled course with progress, falling back
  // to the most-viewed published course.
  const byViews = [...courses].sort((a, b) => b.views - a.views);
  let heroCourse = byViews[0];
  let heroProgress = 0;
  let heroHref = heroCourse ? `/courses/${heroCourse.slug}` : "/courses";

  if (userEnrollments.length > 0) {
    const latest = [...userEnrollments].sort(
      (a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime(),
    )[0];
    const found = courses.find((c) => c.id === latest.courseId);
    if (found) {
      heroCourse = found;
      const total = found.modules.flatMap((m) => m.lessons).length;
      heroProgress = total ? Math.round((latest.completedLessonIds.length / total) * 100) : 0;
      heroHref = heroProgress > 0 ? `/learn/${found.slug}` : `/courses/${found.slug}`;
    }
  }

  return (
    <HomeView
      home={content.home}
      courseCard={content.courseCard}
      courses={courses}
      channelStats={channelStats}
      instructor={instructor}
      heroCourse={heroCourse}
      heroProgress={heroProgress}
      heroHref={heroHref}
      isAuthed={!!sessionUser}
    />
  );
}
