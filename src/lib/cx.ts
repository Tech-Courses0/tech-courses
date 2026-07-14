/** Tiny classnames joiner — the editor components only ever pass strings and
 *  falsy values (no object/array form), so this covers every call site without
 *  pulling in clsx. */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
