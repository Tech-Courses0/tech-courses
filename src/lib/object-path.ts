/**
 * Minimal dot-path get/set for the editor's in-memory content tree
 * (e.g. "home.tracks.title", "footer.columns.2.links.0.label"). No lodash —
 * the content tree is small and this is the only place that needs addressing.
 */

export function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

/** Returns a new object/array tree with `value` set at `path`; does not mutate `obj`. */
export function setPath<T>(obj: T, path: string, value: unknown): T {
  return setAt(obj, path.split("."), value) as T;
}

function setAt(node: unknown, keys: string[], value: unknown): unknown {
  const [key, ...rest] = keys;
  const isArray = Array.isArray(node);
  // node may be a primitive (a legacy string item being upgraded to an object
  // shape) — spreading a string here would fan it out into {0:'a',1:'b',...}
  // instead of starting a fresh object, silently corrupting the item.
  const clone: Record<string, unknown> | unknown[] = isArray
    ? [...(node as unknown[])]
    : isPlainObject(node)
      ? { ...node }
      : {};

  if (rest.length === 0) {
    (clone as Record<string, unknown>)[key] = value;
  } else {
    const child = (node as Record<string, unknown> | undefined)?.[key];
    (clone as Record<string, unknown>)[key] = setAt(child, rest, value);
  }
  return clone;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Recursively overlays `override` onto `base`, returning a new tree.
 * Plain objects merge key-by-key; **arrays and primitives from `override`
 * replace wholesale** (so a stored content row's deletes/reorders stick, and a
 * stored array is never element-merged with the default). Keys present in
 * `base` but missing from `override` keep the base value — this lets the
 * content schema grow without re-seeding old DB rows.
 */
export function deepMerge<T>(base: T, override: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override === undefined ? base : (override as T);
  }
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(override)) {
    out[key] = deepMerge(out[key], (override as Record<string, unknown>)[key]);
  }
  return out as T;
}
