"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRightIcon } from "@/components/icons";

const topics = ["course question", "technical issue", "content suggestion", "partnership", "other"];

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(true);
  }

  return (
    <div className="container-page py-14 md:py-20">
      <div className="max-w-3xl">
        <p className="eyebrow">{"//"} contact / hello</p>
        <h1 className="mt-5 text-4xl font-bold leading-tight text-ink md:text-6xl">
          Have a question?<br />
          <span className="text-accent">Let&apos;s talk.</span>
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-muted md:text-lg">
          Need help choosing a course, spotted an issue, or have an idea for the channel? Send a note and the Tech Courses team will take a look.
        </p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <section className="term" aria-labelledby="message-heading">
          <div className="term-bar">
            <span className="term-dots" aria-hidden><span className="term-dot" /><span className="term-dot" /><span className="term-dot" /></span>
            <span className="term-title">tech-courses@academy: ~/message</span>
          </div>
          <div className="p-6 md:p-8">
            <h2 id="message-heading" className="sr-only">Send a message</h2>
            {sent ? (
              <div className="border border-line bg-surface-2 p-6" role="status">
                <p className="font-mono text-sm text-accent">message drafted_</p>
                <p className="mt-3 leading-relaxed text-muted">Thanks for reaching out. This form is currently a front-end contact point; connect an inbox or form provider to receive submissions in production.</p>
                <button type="button" className="btn btn-outline mt-6" onClick={() => setSent(false)}>send another</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block font-mono text-sm text-ink-soft">name<input className="field mt-2" name="name" required autoComplete="name" /></label>
                  <label className="block font-mono text-sm text-ink-soft">email<input className="field mt-2" name="email" type="email" required autoComplete="email" /></label>
                </div>
                <label className="block font-mono text-sm text-ink-soft">topic<select className="field mt-2" name="topic" defaultValue={topics[0]}>{topics.map((topic) => <option key={topic}>{topic}</option>)}</select></label>
                <label className="block font-mono text-sm text-ink-soft">message<textarea className="field mt-2 min-h-36 resize-y" name="message" required /></label>
                <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                  <p className="text-xs leading-relaxed text-muted">Please don&apos;t share passwords or sensitive personal information.</p>
                  <button type="submit" className="btn btn-primary">send message <ArrowRightIcon width={15} height={15} /></button>
                </div>
              </form>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="card p-6">
            <p className="mono-label uppercase tracking-[0.16em]">{"//"} fastest route</p>
            <h2 className="mt-3 text-xl font-bold text-ink">Ask on the channel</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">For course-specific questions, the Tech Courses YouTube channel is the quickest way to find updates and community answers.</p>
            <a className="btn btn-outline mt-5" href="https://youtube.com/@techcourses4u" target="_blank" rel="noreferrer">open YouTube <ArrowRightIcon width={15} height={15} /></a>
          </div>
          <div className="card p-6">
            <p className="mono-label uppercase tracking-[0.16em]">{"//"} keep learning</p>
            <p className="mt-3 text-sm leading-relaxed text-muted">While you&apos;re here, browse the free catalog or sign in to keep your progress synced.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link className="link-draw font-mono text-sm font-semibold text-accent" href="/courses">browse courses →</Link>
              <Link className="link-draw font-mono text-sm font-semibold text-accent" href="/signup">start free →</Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
