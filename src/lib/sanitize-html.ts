/**
 * Threat model: the only author is the authenticated site owner (gated by the
 * `ca_admin` cookie in proxy.ts), and EditableRichText forces plain-text paste,
 * so this only guards the owner's own contentEditable output (browsers inject
 * odd markup via execCommand) — not a hostile third party. A small allowlist is
 * enough; no full HTML-parser dependency.
 *
 * Regex tokenizer (not DOMParser) so it runs in both the browser (editor blur
 * handler) and Node (server components render sanitized HTML).
 *
 * Allowlist: b, strong, i, em, u, a, br, font. Everything else — every other
 * tag, every attribute except <a href> and <font color> (color must be a plain
 * hex value) and any javascript:/data: href — is stripped. Disallowed tags are
 * unwrapped (their text content is kept).
 */

const ALLOWED_TAGS = new Set(["b", "strong", "i", "em", "u", "a", "br", "font"]);
const SAFE_HREF = /^(https?:|mailto:|\/)/i;
const SAFE_COLOR = /^#[0-9a-fA-F]{3}$|^#[0-9a-fA-F]{6}$/;
const TOKEN_RE = /<[^>]*>|[^<]+/g;
const TAG_NAME_RE = /^<\/?\s*([a-zA-Z][a-zA-Z0-9]*)/;
const HREF_RE = /href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;
const COLOR_RE = /color\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;

export function sanitizeHtml(html: string): string {
  const tokens = html.match(TOKEN_RE) ?? [];
  let out = "";

  for (const token of tokens) {
    if (token[0] !== "<") {
      out += token;
      continue;
    }

    const nameMatch = TAG_NAME_RE.exec(token);
    if (!nameMatch) continue; // stray "<" with no tag name — drop

    const tag = nameMatch[1].toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) continue; // unwrap: drop tag, keep surrounding text

    const isClosing = token[1] === "/";
    if (isClosing) {
      out += `</${tag}>`;
      continue;
    }

    if (tag === "a") {
      const hrefMatch = HREF_RE.exec(token);
      const href = hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? "";
      out += SAFE_HREF.test(href)
        ? `<a href="${escapeAttr(href)}" rel="noopener noreferrer">`
        : `<a>`;
      continue;
    }

    if (tag === "br") {
      out += "<br>";
      continue;
    }

    if (tag === "font") {
      const colorMatch = COLOR_RE.exec(token);
      const color = colorMatch?.[1] ?? colorMatch?.[2] ?? colorMatch?.[3] ?? "";
      out += SAFE_COLOR.test(color) ? `<font color="${escapeAttr(color)}">` : `<font>`;
      continue;
    }

    out += `<${tag}>`;
  }

  return out;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
