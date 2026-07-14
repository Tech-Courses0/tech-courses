"use client";

import { useState } from "react";

export default function EditorLoginPage() {
  const [username, setUsername] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/editor/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, secret }),
      });
      if (res.ok) {
        window.location.href = "/admin/editor";
        return;
      }
      const { error: msg } = await res.json().catch(() => ({ error: "Login failed." }));
      setError(msg ?? "Login failed.");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-page flex min-h-[calc(100svh-4rem)] items-center justify-center py-16">
      <div className="term relative w-full max-w-sm">
        <div className="term-bar">
          <span className="term-dots" aria-hidden>
            <span className="term-dot" />
            <span className="term-dot" />
            <span className="term-dot" />
          </span>
          <span className="term-title">admin — sign in</span>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-4 p-6">
          <div>
            <p className="mono-label">
              <span className="term-prompt text-accent" />site editor
            </p>
            <h1 className="mt-2 text-xl font-bold text-ink">Website editor sign-in</h1>
            <p className="mt-1 text-sm text-muted">Enter the editor username and password.</p>
          </div>
          <label className="flex flex-col gap-1">
            <span className="mono-label">username</span>
            <input
              className="field"
              value={username}
              autoComplete="username"
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="mono-label">password</span>
            <input
              className="field"
              type="password"
              value={secret}
              autoComplete="current-password"
              onChange={(e) => setSecret(e.target.value)}
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" disabled={busy} className="btn btn-primary">
            {busy ? "signing in…" : "sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
