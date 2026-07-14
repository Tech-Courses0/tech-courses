import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { themeScript } from "@/components/theme-toggle";
import { LenisProvider } from "@/components/motion/lenis-provider";
import { BackgroundField } from "@/components/background/background-field";
import { getCurrentUser, getUserEnrollments } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { getLiveContent } from "@/lib/site-content";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getLiveContent();
  return {
    title: { default: site.metaTitle, template: "%s · Tech Courses" },
    description: site.metaDescription,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const content = await getLiveContent();
  const sessionUser = await getCurrentUser();
  const initialUser = sessionUser
    ? { name: sessionUser.name, email: sessionUser.email }
    : null;
  const initialEnrollments = sessionUser ? await getUserEnrollments(sessionUser.id) : [];
  const initialIsAdmin = sessionUser ? await isAdmin(sessionUser.email) : false;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <BackgroundField />
        <StoreProvider
          initialUser={initialUser}
          initialEnrollments={initialEnrollments}
          initialIsAdmin={initialIsAdmin}
        >
          <LenisProvider>
            <SiteHeader content={content} />
            <main className="flex-1">{children}</main>
            <SiteFooter content={content} />
          </LenisProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
