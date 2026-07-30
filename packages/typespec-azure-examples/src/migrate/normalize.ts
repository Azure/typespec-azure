/**
 * Normalize embedded concrete API-version strings to the `{api-version}` placeholder.
 *
 * `x-ms-examples` frequently bake the api-version into header and body string values
 * (`Location`, `Azure-AsyncOperation`, `nextLink`, ...). Replacing those with `{api-version}`
 * lets otherwise-identical variants across versions collapse into a single lineage entry.
 */

/** Recursively replace occurrences of `version` in string values with `{api-version}`. */
export function normalizeApiVersion<T>(value: T, version: string): T {
  return normalize(value, buildMatcher(version)) as T;
}

/**
 * Normalize using any of the provided versions (longest first, so more specific version strings
 * win over prefixes).
 */
export function normalizeApiVersions<T>(value: T, versions: readonly string[]): T {
  const ordered = [...new Set(versions)]
    .filter((v) => v.length > 0)
    .sort((a, b) => b.length - a.length);
  if (ordered.length === 0) return value;
  const matcher = new RegExp(ordered.map(escapeRegExp).join("|"), "g");
  return normalize(value, matcher) as T;
}

function buildMatcher(version: string): RegExp {
  return new RegExp(escapeRegExp(version), "g");
}

function normalize(value: unknown, matcher: RegExp): unknown {
  if (typeof value === "string") {
    matcher.lastIndex = 0;
    return value.replace(matcher, "{api-version}");
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalize(item, matcher));
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = normalize(item, matcher);
    }
    return out;
  }
  return value;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
