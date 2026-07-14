# Visual CMS Editor — Build Guide

A portable spec for the in-place visual editor used on ajrgca.com. Hand this
file to Claude in another Next.js project and say: **"Build the visual editor
described in this doc for this site."** It documents the architecture, the exact
file layout, every gotcha, and the invariants that make it work.

The editor lets a single non-technical owner edit the live site inline —
click any text, image, list, icon, colour, or global setting — with autosave,
undo/redo, draft-vs-live separation, and one-click Publish. No page builder, no
per-field admin forms: the public components ARE the editor surface.

---

## 1. Core idea

Every public component receives its data as a `content` prop and renders
editable primitives (`<EditableText>`, `<EditableImage>`, …) instead of raw
strings. Those primitives do two things depending on context:

- **Public site** (no editor provider): render the plain `value` prop. Zero
  overhead, zero editor code shipped in the interactive path.
- **Inside `/admin/editor`** (wrapped in `<EditorProvider>`): render an
  editable control bound to a **dot-path** into the content tree
  (e.g. `"hero.subtitle"`, `"services.2.title"`). Edits update in-memory state,
  autosave to a **draft** row, and Publish copies draft → **live**.

The switch is a single hook, `useEditor()`, which returns `isEditing: false`
when there's no provider. This is the linchpin — the same component works on
both the public page and inside the editor with no branching at the call site.

**Gotcha:** any page-view component that calls `useEditor()` itself (not just
renders `Editable*` children) needs `'use client'` at the top of the file. It's
easy to add a new page view, forget the directive, and have it work fine until
Next renders it as a Server Component — the failure is `Attempted to call
useEditor() from the server`, and it only shows up once that route is actually
hit, not at build/lint time.

---

## 2. Data flow (memorise this)

```
config/site.ts + data/*.ts        ← build-time defaults (hardcoded seed)
        │
        ▼
lib/content.ts  defaultContent()  ← assembles the full SiteContent seed
        │
        ▼
Postgres table site_content       ← two rows: id='draft', id='live'
   (JSONB `data` column)              stored value is deepMerge'd over
        │                              defaultContent() on read, so the schema
        │                              can grow without re-seeding old rows
        ├── getLiveContent() ──► public pages (props)   [force-dynamic]
        └── getDraftContent() ─► /admin/editor (props → EditorProvider)
```

- **Public pages** call `getLiveContent()` in the server component and pass the
  result down as props. They MUST be `export const dynamic = 'force-dynamic'`
  so a Publish shows up immediately without a redeploy. (Static rendering would
  bake content in at build time — the #1 "why don't my edits show" trap.)
- **The editor page** calls `getDraftContent()` and hands it to `<EditorShell>`
  → `<EditorProvider initialContent=…>`.
- Reads are cheap enough (one JSONB row) that no cache layer is used. Don't add
  one unless traffic demands it — cache invalidation on Publish is complexity
  you don't need.

### deepMerge / overlay rule
On read, the stored row is `deepMerge(defaultContent(), storedRow)`:
- plain objects merge key-by-key (new schema fields fall back to defaults),
- **arrays and primitives from the stored row replace wholesale** (so the
  owner's deletes/reorders/edits stick and never element-merge with defaults).

This is what lets you ship new content fields later without a migration.

---

## 3. Persistence & content model

### DB (Postgres; Neon on Vercel, any Postgres on a VPS)
```sql
create table if not exists site_content (
  id text primary key check (id in ('draft', 'live')),
  data jsonb not null,
  updated_at timestamptz not null default now()
);
```
`lib/db.ts` returns `null` when `DATABASE_URL` is unset so the whole site still
renders from `defaultContent()` with zero DB config. Writes throw a clear error
in that case.

### lib/content.ts — the whole persistence surface
```
defaultContent(): SiteContent          // build the seed from config + data/*
readRow(id): deepMerge(default, stored) // overlay stored over defaults
getLiveContent()   → live row  ?? defaultContent()
getDraftContent()  → draft row ?? live row ?? defaultContent()
saveDraftContent(content)              // upsert draft
publishContent(message)                // copy draft → live, log to site_content_history, mirror to GitHub
listContentHistory(limit = 5)          // last N published versions (id, message, createdAt)
revertToHistory(id)                    // load a past version back into draft (review before Publish)
revertToOriginal()                     // wipe draft + live back to defaultContent(), live immediately
```

### types/content.ts — `SiteContent`
One big typed tree: `site` (global settings), `theme`, `nav`, `footer`, plus a
key per page/section (`hero`, `services`, `industries`, `pages`, `layout`, …).
The `site` object is the "global settings" surface edited via the Settings
panel, not inline. Keep it a plain-data mirror (no functions) so it serialises
to JSONB.

---

## 4. Auth (single-owner, no user table)

Two env vars, a cookie, and middleware. No accounts, no DB users.

```
EDITOR_USERNAME   the login username
EDITOR_SECRET     the password AND the cookie value (they're the same string)
```

- `app/api/admin/login/route.ts` (**POST**): checks `{username, secret}` against
  the two env vars; on match sets cookie `ajrg_admin=<EDITOR_SECRET>`
  (`HttpOnly; Secure in prod; SameSite=Lax; Path=/; Max-Age=30d`). Includes a
  tiny in-memory IP rate-limiter (8 tries / 15 min) — fine for a single-owner
  site; move to KV if it ever runs multi-instance.
- `proxy.ts` (Next.js middleware — **filename is `proxy.ts` on Next 15.5+/16**,
  `middleware.ts` on older; exports the gate + a `config.matcher`): gates
  `/admin/editor/*` and `/api/admin/*` (except `login`/`logout`). Passes when
  `cookie === EDITOR_SECRET`, else 401 for API and 307→`/admin/login` for pages.
- `app/api/admin/logout/route.ts` (**POST — never GET**): deletes the cookie.

> ### ⚠️ THE GOTCHA THAT COST HOURS — logout MUST be POST
> If logout is a `GET` and the Exit control is a Next.js `<Link href=…>`,
> **Next.js prefetches the link in production** → rendering the editor silently
> fires logout → the session cookie is deleted before the first edit → every
> save returns 401 "Save failed". It works perfectly in `next dev` because dev
> disables Link prefetch — a textbook works-local-breaks-prod trap.
>
> **Rule:** any state-mutating endpoint (logout especially) is a `POST`
> triggered by an `onClick` fetch, never a prefetchable `GET` `<Link>`.

Keep this editor secret separate from any other admin secret (e.g. a Google/
OAuth connect key) so rotating the editor password never breaks other flows.

---

## 5. API routes (all under `app/api/admin/`, all gated by proxy)

| Route | Method | Does |
|---|---|---|
| `login`   | POST | set `ajrg_admin` cookie |
| `logout`  | POST | delete cookie |
| `content` | GET  | return draft content |
| `content` | PATCH| `saveDraftContent(body)` (autosave target) |
| `publish` | POST | `publishContent(message)` (draft → live; `message` required) |
| `history` | GET  | `listContentHistory(5)` |
| `history/revert` | POST | `revertToHistory(id)` (past version → draft) |
| `history/revert-original` | POST | `revertToOriginal()` (wipe → defaults, live immediately) |
| `upload`  | POST | image upload → Vercel Blob, or `public/uploads/` fallback when no `BLOB_READ_WRITE_TOKEN`. Validates type (jpg/png/webp/gif/svg) + 5 MB cap. |

Routes carry no auth logic of their own — the proxy is the single gate.

---

## 6. Client state — `EditorContext.tsx`

`EditorProvider` holds the whole content tree as an **undo/redo history array**
+ index. `useEditor()` exposes:

```ts
isEditing, content, getValue(path), setValue(path, value),
undo, redo, canUndo, canRedo,
saveStatus,                       // 'idle'|'saving'|'saved'|'error'
publish, publishing, published
```

- `setValue(path, value)` → `setPath(content, path, value)` (immutable, see
  `lib/objectPath.ts` — a ~30-line dot-path get/set, no lodash), pushes onto
  history, and schedules a **debounced autosave** (800 ms) that PATCHes
  `/api/admin/content`. `res.ok ? 'saved' : 'error'` drives the toolbar label.
- **`useEditor()` returns `isEditing: false` and no-op fns outside a provider.**
  This is deliberate: the same `<EditableText>` renders on the public site.

`lib/objectPath.ts` provides `getPath`, `setPath` (immutable), and `deepMerge`.

---

## 7. Editable primitives — `components/editable/`

Each primitive: on public site render plain `value`; in editor render a bound
control. All take a `path` (dot-path) + a `value` (current/fallback).

| Component | Edits | Notes |
|---|---|---|
| `EditableText`     | single-line string | click once to select (outline, no cursor), click again to type (see invariant below); optional `hrefPath` shows a link chip + warned URL editor, opened only from the chip — never auto-opened on select |
| `EditableRichText` | HTML string | same click-to-select/click-to-edit model; bold/italic/underline/link toolbar + theme colour swatches (`foreColor`) on text selection; sanitised — `<font color>` allowed only with a hex value, everything else stripped |
| `EditableImage`    | image URL | click → upload via `/api/admin/upload` |
| `EditableRepeater` | arrays | add / reorder / duplicate / delete list items; non-editing render path must wrap each `renderItem(item, i)` in a keyed `<Fragment key={i}>` — a caller whose own `renderItem` returns an element with no key of its own (e.g. a bare `<Link>`/`<button>`) otherwise throws React's "each child in a list needs a unique key" warning; keying it once here covers every repeater on the site instead of patching each caller |
| `IconField`        | icon key | popover grid of a curated lucide set |
| `SettingsPanel`    | `site.*` globals | firm name, FRN, offices, phone, email, legal text, socials |
| `ThemePanel`       | `theme` | preset palette + per-token colour overrides |
| `EditorToolbar`    | — | page tabs, undo/redo, save status, Theme/Settings, History (last 5 published versions + revert-to-original), **Exit (POST)**, Publish (requires a change message) |
| `EditorDrawer`     | — | slide-over host for the Theme/Settings panels |
| `EditorContext`    | — | provider + `useEditor()` |

### The click-to-select / click-to-edit invariant (do NOT regress)
Single click on a text field **selects** it (focus + outline, `contentEditable:
false` — no cursor). Clicking **again** on the field that's already focused is
what arms `contentEditable: true` and drops a caret — a Finder/Explorer-style
rename, not a double-click. Detect it in `onMouseDown` (fires *before* this
click's own focus change lands), by checking whether the field was *already*
`document.activeElement`:
```ts
function handleMouseDown(e) {
  if (!editing && document.activeElement === ref.current) {
    pendingCaret.current = { x: e.clientX, y: e.clientY }
    setEditing(true)
  }
}
```
`onDoubleClick` is the wrong tool here — it demands two clicks inside the
browser's dblclick timing window; two deliberate, slower clicks (the whole
point of "select, then edit") don't fire it.

Toggling `contentEditable` on a focused node loses whatever native caret
placement the browser would have applied *during* the click that flips it
(contentEditable was still `false` when the click happened). Restore it
yourself: capture the click's `{x, y}`, then once `editing` flips true, use
`document.caretRangeFromPoint(x, y)` (Chromium) /
`document.caretPositionFromPoint(x, y)` (Firefox) in a `useEffect` to rebuild a
`Range` and apply it via `window.getSelection()`.

Binding the text as React `children` (`EditableText`) or
`dangerouslySetInnerHTML` (`EditableRichText`) — instead of the old
imperative-ref `node.textContent = …` approach — turns out to be safe: React
bails out of touching a text node whose string value is unchanged, so unrelated
re-renders elsewhere in the tree (autosave status ticking, a sibling field
being edited) don't rewrite *this* node or collapse its caret, as long as
`current` (from `getValue(path)`) only changes when *this* path's value
actually changes.

Still true regardless of the above: emit exactly one outline colour at a time
(dirty = blue, else transparent+hover) — two `outline-*` utilities at equal
specificity let Tailwind's last-emitted win and the border silently never
paints. And if the site has a global
`:where(a, button, [tabindex]):focus-visible { outline: … }` reset, it ties the
editor's blue on specificity and can win — scope the editor's colour with a
`focus-visible:outline-[…]` variant so it always beats the global rule.

### ⚠️ Tailwind `group`/`group-hover` may silently not compile under Turbopack
Observed on a Next.js dev server running Turbopack (`next dev` — Next 15+/16
can default to it with no flag): **zero** `.group`/`group-hover` CSS rules were
emitted anywhere in the compiled stylesheet, while the exact same classes
rendered correctly in the DOM and plain `hover:`, `focus-within:`, `opacity-*`
etc. all compiled fine. Only the `group`/`group-hover` variant (named or
unnamed) produced nothing.

Symptom, if you build a hover-reveal control this way: it never appears on
real mouse hover, but it's still *there* — opacity doesn't gate pointer-events,
so clicking blind where it should be still works, and its native `title`
tooltip still pops up (browser chrome, unaffected by CSS) — which reads like a
z-index/positioning bug, not a compiler one, and can burn a lot of time.

Fix: don't build hover-reveal controls on CSS `group`/`group-hover` in this
stack. Track hover in JS state instead (`onMouseEnter`/`onMouseLeave` setting
an index/boolean, applied via a conditional class) — works regardless of
Tailwind/Turbopack version. To confirm you've hit this bug rather than
something else, dump the live stylesheet from the console:
```js
function walk(rules, out) { for (const r of rules) { if (r.selectorText) out.push(r.selectorText); if (r.cssRules) walk(r.cssRules, out) } }
const out = []; for (const s of document.styleSheets) { try { walk(s.cssRules, out) } catch {} }
out.some(sel => sel.includes('group')) // false ⇒ hit this bug
```
(walk recursively — `@layer`/`@media` container rules hide the utility rules
inside them from a flat `sheet.cssRules` scan.)

### `EditableRepeater` — click-to-select variant
The reference implementation moved the per-item control bar (move/duplicate/
delete/drag) from **hover**-reveal to **click**-to-select: click an item to
select it (shows the bar + an outline), click outside any item to deselect.
Two things that variant needs that hover-reveal didn't:
- If `renderItem` wraps its content in a real `<Link>`/`<a>` (a nav-item
  repeater, say), the selecting click must never navigate. Guard it on the
  item wrapper: `onClickCapture={(e) => { if ((e.target as
  HTMLElement).closest('a')) e.preventDefault() }}` — only when `isEditing`.
- Position the control bar **outside** the item's own box (e.g. hanging off
  the bottom edge, horizontally centered) instead of inset/overlapping its
  content. Inset positioning near a page's top edge can collide with a fixed
  toolbar above it (z-index race across separate stacking contexts), and
  overlapping a small item can make the bar wider than the item itself,
  spilling into a neighbor. A badge positioned `absolute` outside its parent's
  visual box is still a DOM *child* of it, so hover/click containment checks
  (`el.contains(e.target)`) keep working unchanged — containment is DOM-based,
  not visual.

### The floating rich-text toolbar (do NOT regress)
`EditableRichText`'s selection model is: single click selects the field
(outline, no cursor); a second click arms `contentEditable` and drops a
cursor. That second click is, mechanically, a **native double-click** — and
that causes three non-obvious bugs if you don't guard for them:

1. **Don't show the toolbar just from arming.** A native double-click
   auto-selects the word under the cursor even when the user only meant "let
   me start typing here." If the arm-effect blindly shows the toolbar for any
   non-collapsed selection, it flashes on every single arm. Fix: after arming,
   explicitly collapse to a caret and hide the toolbar *unless* the selection
   really is a deliberate word-select (see next point).
2. **…but a genuine double-click-to-select-a-word must still show it.**
   Standard editor behaviour (Word, Docs) is double-click selects the word.
   Don't special-case away the toolbar unconditionally — check, in the
   arm-effect, whether a real non-collapsed selection already exists inside
   the field; if so, keep it and show the toolbar instead of stomping it with
   a fresh collapsed caret. Word-select landing here can also skip the normal
   `onFocus` event, so manually force focus + the dirty-outline state in this
   branch too, or the field looks unselected despite being armed.
3. **Never call `removeAllRanges()`/`addRange()` on a selection that might
   still be mid-drag.** The caret-placement helper used to retroactively
   position the cursor after the field flips to `contentEditable=true` always
   resets the Selection object. Doing that while the mouse button is still
   down (the user click-dragging to select a phrase) fights the browser's own
   in-progress selection tracking and silently drops focus — and the dirty
   outline with it — the instant the button is released. Fix: only touch the
   selection in the arm-effect if the native click didn't already leave a
   usable one in the field; leave an active drag alone entirely.

**Selection colour must differ from the outline colour.** If both the
"dirty" outline and the text-selection highlight use the same blue, a fully
selected field's solid selection fill visually swallows its own 1–2px border
— it looks unbordered even though it isn't. Use a lighter tint for
`::selection` (scoped to the editor via a `selection:` Tailwind variant on the
shared outline class, not a global override) than for the outline itself.

If the site has its own global `::selection` (a branded highlight colour for
public-site text selection), don't touch that rule — scope the editor's
selection colour to the `Editable*` components' own class so the public
site's selection styling is untouched.

---

## 8. Editor shell — `app/admin/editor/`

```
page.tsx        server component: getDraftContent() → <EditorShell initialContent=…>
EditorShell.tsx 'use client': <EditorProvider> + <EditorToolbar> + the selected
                page view + Theme/Settings drawers.
```
- Page tabs switch which public "page view" renders inside the provider (Home,
  About, Services, …). Each page view is the SAME component the public route
  uses, fed `content`.
- `onClickCapture` on the wrapper calls `e.preventDefault()` for any `<a href>` —
  inside the editor, clicking a link must NOT navigate; you edit in place and
  switch pages via toolbar tabs.

---

## 9. Theme + icons (optional but included)

- `lib/themes.ts`: curated palette presets. `theme.presetId` selects one;
  `theme.tokens` holds per-token overrides. Resolved = preset + overrides,
  applied as CSS custom properties (`--accent`, `--ink`, …) via a
  `ThemeStyleLive` component in the editor and the normal stylesheet publicly.
- `lib/icons.ts`: a single `iconMap` (curated lucide keys) + `FALLBACK_ICON` +
  `getIcon(key?)` that tolerates unknown/missing keys. `IconField` renders the
  grid; public components call `getIcon(content-stored-key)`.
- **Store the icon key per item, never positionally.** A list that picks its
  icons by index (`ICONS[i % ICONS.length]`) can't be owner-chosen. Give the
  item an `icon: IconKey` field and render `<IconField path="…​.icon" value=…>`.
- **Shape-migration tolerance.** Turning a `string[]` list into
  `{ label, icon }[]` is a content-shape change: because `deepMerge` replaces
  arrays wholesale, an already-saved draft still holds the old `string[]`. Make
  `renderItem` tolerate both (`typeof item === 'string'` → render label + the
  fallback icon, no picker) so an existing draft never crashes after deploy.

---

## 10. What to make editable — the two rules

Deciding what gets an inline control vs. what lives elsewhere is a design call,
not a mechanical one. Two rules keep it clean:

**A. A Settings-owned field is edited in exactly ONE place.** If a value lives
in `site.*` and is exposed in `SettingsPanel`, **remove its inline `<Editable*>`
everywhere** and render it plain (`{site.wordmark}`). Leaving both an inline
editor *and* a Settings field for the same value gives the owner two controls
that fight over one string — they edit one, the other looks broken. On this site
the Settings-only (locked, no inline editor) fields are: wordmark, legal name,
tagline, disclaimer, DPDP note. Reason: they're global identity/legal copy that
should change once and propagate, not be nudged per-page.

**B. Not everything repeated should be editable.** Copy that repeats across the
site but isn't the owner's to routinely change — SLA promises, legal microcopy —
belongs as a single **code constant**, not a content field. Example:
`site.responseTime = 'one business day'` in `config/site.ts`, interpolated
everywhere (`within ${site.responseTime}`), including **server code**
(confirmation emails in `lib/*`) and deeply-nested leaf/client components. One
edit in code updates all N spots; it just isn't exposed in the editor UI.

**Corollary — don't over-thread `content`.** Public leaf components with no
`content` prop (forms, small client widgets) can `import { site } from
'@/config/site'` and read those constants directly. The prop-threaded `content`
tree is for owner-**editable** fields; static firm constants don't need to be
plumbed all the way down just to reach a value the owner won't touch. (Remember
`useEditor()` returns `content: null` on the public site — a leaf can't reach the
live tree via the hook anyway; it's props or the static import.)

**C. Before upgrading a field from `EditableText` to `EditableRichText`
(or handing it any richer capability), grep for every OTHER place that same
value is rendered.** A field is often shown more than once: an admin
"manage X" panel plus a read-only public card/grid preview of the same data,
a nav mega-menu mirroring page content, an `aria-label`/`alt` built from the
same string, or a `generateMetadata()` reading it for `<title>`/OG tags. If
even one of those other render sites prints the value as a **raw string**
(`{item.title}`, not through an `Editable*` component or `dangerouslySetInnerHTML`
+ your sanitizer), upgrading it to store HTML will leak literal `<strong>`/`<a>`
tags there — or worse, break an `alt`/`aria-label`/page-title that must stay
plain text. Two options when you find a raw duplicate: leave the field as
`EditableText`, or update *every* raw render site to sanitize + `dangerouslySetInnerHTML`
too. Don't upgrade the field and stop at one call site. Fields with an
`hrefPath` prop (link-chip editing) also can't move to `EditableRichText` at
all — it has no equivalent link-chip UI, so the field would silently lose
that capability.

---

## 11. Build order (what Claude should do to replicate)

1. **Content model**: define `types/content.ts` (`SiteContent`) + `config/site.ts`
   + `data/*` seeds + `lib/content.ts` (`defaultContent`, read/write, publish,
   history, revert-to-original) + `lib/db.ts` + `lib/github.ts` + the
   `site_content` / `site_content_history` SQL.
2. **Make public pages prop-driven + `force-dynamic`**, reading `getLiveContent()`.
3. **`lib/objectPath.ts`** (getPath/setPath/deepMerge).
4. **`EditorContext.tsx`** (provider, history, debounced autosave, publish).
5. **Primitives** (`EditableText` first — it sets the contentEditable pattern).
6. **API routes** (`login` POST, `logout` POST, `content` GET/PATCH, `publish`,
   `history` GET, `history/revert`, `history/revert-original`, `upload`).
7. **`proxy.ts`** middleware gate + matcher.
8. **Editor shell** (`page.tsx` + `EditorShell.tsx`) + toolbar/drawers/panels.
9. **Env**: `EDITOR_USERNAME`, `EDITOR_SECRET`, `DATABASE_URL`, optional
   `BLOB_READ_WRITE_TOKEN`, optional `GITHUB_TOKEN`/`GITHUB_REPO`. Run the
   `site_content` / `site_content_history` DDL once against the DB.

## 12. Deploy checklist (don't get burned again)
- [ ] All public pages `force-dynamic` (else Publish needs a redeploy).
- [ ] `site_content` table created in the target DB.
- [ ] Any **content-shape change** (e.g. a list `string[]` → `{…}[]`) has
      legacy-tolerant `renderItem` — the live/draft row still holds the old
      shape until it's re-saved, and `deepMerge` won't rewrite it (§9).
- [ ] Every page-view component that calls `useEditor()` has `'use client'`.
- [ ] Any field just upgraded to `EditableRichText` has no other raw-string
      render site (card/grid preview, nav mirror, `alt`/`aria-label`,
      `generateMetadata`) that would now leak HTML tags (§10.C).
- [ ] `EDITOR_USERNAME` + `EDITOR_SECRET` set in the deploy env **and** the
      running build was deployed *after* they were added (env changes need a
      redeploy/restart to load).
- [ ] Logout is **POST**; Exit is an `onClick` fetch, not a `<Link>`.
- [ ] `DATABASE_URL` set; `BLOB_READ_WRITE_TOKEN` set if you want cloud image
      uploads (else images land in `public/uploads/`).
- [ ] Cookie is `Secure` in prod → the site must be served over HTTPS.

---

## 13. One-shot implementation prompt

Copy the prompt below into a new coding-agent session **from the root of the
target Next.js site**. Keep this document in that repository as
`docs/VISUAL-EDITOR.md`, or provide its absolute path. The agent must read this
document in full before changing code.

> You are working in an existing Next.js website. Implement the complete
> production-ready visual CMS editor described in `docs/VISUAL-EDITOR.md` in
> this repository in one pass. Do not build a separate page builder or a
> parallel demo. Integrate the editor into this site's existing routes,
> components, styling, and deployment conventions.
>
> First, inspect the whole application: `package.json`, routing structure,
> layouts, public page components, current content/data/config modules, auth or
> middleware, database utilities, environment examples, and all places that
> render the same content more than once (including metadata, alt text, ARIA
> labels, cards, navigation, footers, and server-side emails). Infer the
> site's current content model and make a concise implementation plan for
> yourself. Then implement it; do not stop after the plan and do not ask me to
> carry out steps that are normal code changes.
>
> Required implementation:
>
> 1. Create a complete, serializable, typed `SiteContent` tree which mirrors
>    every owner-editable value in the existing site. Seed it from the site's
>    current hardcoded config/data so the public UI is visually and
>    functionally unchanged before the first edit. Keep code-owned constants
>    out of the editable tree.
> 2. Add the draft/live JSONB content store, deep-merge read behavior,
>    `defaultContent`, draft autosave, publishing, history, reverting, and the
>    SQL DDL from this guide. A site with no `DATABASE_URL` must still render
>    defaults read-only; writes must fail clearly. Preserve the rule that
>    objects merge but arrays/primitives replace wholesale.
> 3. Convert every public route that displays editable content to read
>    `getLiveContent()` on the server, declare `export const dynamic =
>    'force-dynamic'`, and pass content through the existing page views and
>    layout components. Reuse those exact page views in `/admin/editor`; do not
>    duplicate page markup. For static routes that cannot use server data,
>    explain the constraint in the final handoff and use the closest sound
>    equivalent.
> 4. Add `EditorProvider`, immutable dot-path updates, undo/redo,
>    800 ms debounced autosave, save state, Publish with a required change
>    message, and the editable primitives appropriate to this site's content:
>    text, rich text only where all render sites safely support HTML, images,
>    repeaters, link editing, icons, global settings, and theme controls where
>    the site has theme tokens. Outside the provider, every primitive must
>    render the plain public value with no editor behavior.
> 5. Add the protected `/admin/login` and `/admin/editor` experience, toolbar,
>    page switcher, drawers/panels, API routes, image upload, and middleware or
>    proxy gate. Use `EDITOR_USERNAME` and `EDITOR_SECRET`; use an HttpOnly,
>    SameSite=Lax cookie that is Secure in production. Login and logout are
>    POST endpoints. Exit must call POST via `fetch`/a button, never a Next.js
>    link. Exempt only login/logout from the protected admin API matcher.
> 6. In the editor shell, prevent public links from navigating away while
>    editing. Ensure page-view components that call `useEditor()` are client
>    components. Use the click-to-select then click-to-edit text interaction,
>    caret restoration, selection behavior, repeater behavior, sanitization,
>    and Tailwind/Turbopack safeguards specified in this guide. These are
>    required behavior, not optional polish.
> 7. Add/update `.env.example`, database setup documentation or SQL, and any
>    required dependencies. Never expose secrets to the browser and do not
>    overwrite an existing environment file or unrelated site behavior.
>
> Adapt names, routes, visual styling, and the set of editor tabs to the target
> site. Preserve the existing design system. Where the target has a content
> shape different from the default, design the editor around that shape rather
> than forcing AJRGCA-specific fields or page names into it. Be tolerant of
> legacy stored data when changing an array item from a primitive to an object.
>
> Before you finish, verify the implementation end to end: run type checking,
> linting, and a production build using the repository's available scripts;
> fix failures caused by your changes. Start the app locally and manually test
> public rendering, login failure and success, an inline edit, autosave,
> refresh persistence, undo/redo, publish, draft-vs-live separation, history
> revert, logout, and link suppression inside the editor. If external services
> are unavailable, test all paths that can run locally and state the exact
> unverified external dependency.
>
> Finish with a concise report listing the files changed, environment/database
> setup still required, commands run and their results, and any intentional
> limitations. Do not leave a partial scaffold, placeholder controls, TODOs,
> or a step-by-step implementation plan for me to complete.
