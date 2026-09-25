/**
 * Normalize embedded concrete API-version strings to the `{api-version}` placeholder.
 *
 * `x-ms-examples` frequently bake the api-version into header and body string values
 * (`Location`, `Azure-AsyncOperation`, `nextLink`, ...). Replacing those with `{api-version}`
 * lets otherwise-identical variants across versions collapse into a single lineage entry.
 */

/** Recursively replace occurrences of `version` in string values with `{api-version}`. */
export function normalizeApiVersion<T>(value: T, version: string): T {
  return normalize(value, buildMatcher([version])) as T;
}

/**
 * Normalize using any of the provided versions (longest first, so more specific version strings
 * win over prefixes).
 */
export function normalizeApiVersions<T>(value: T, versions: readonly string[]): T {
  const ordered = [...new Set(versions)].filter((v) => v.length > 0);
  if (ordered.length === 0) return value;
  return normalize(value, buildMatcher(ordered)) as T;
}

/**
 * A trailing guard so an api-version string is only matched as a whole token. Azure api-versions are
 * `YYYY-MM-DD[-suffix]` and are never immediately followed by a digit or the ISO-8601 time
 * designator `T`, so this prevents corrupting embedded timestamps such as `2023-01-01T09:00:00Z`.
 */
const VERSION_BOUNDARY = "(?![T\\d])";

interface Matcher {
  /** Matches every embedded api-version occurrence (URLs, headers, ...). */
  readonly embedded: RegExp;
  /** Matches a scalar whose entire value is a bare api-version (real data, not an embedded ref). */
  readonly bare: RegExp;
}

function buildMatcher(versions: readonly string[]): Matcher {
  // Longest first so a more specific version (e.g. `...-preview`) wins over a prefix.
  const alternation = [...versions]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|");
  return {
    embedded: new RegExp(`(?:${alternation})${VERSION_BOUNDARY}`, "g"),
    bare: new RegExp(`^(?:${alternation})$`),
  };
}

function normalize(value: unknown, matcher: Matcher): unknown {
  if (typeof value === "string") {
    // A scalar whose entire value is a bare api-version is real data (e.g. a `date` field), not a
    // version embedded in a URL or header — leave it untouched so migration stays lossless.
    if (matcher.bare.test(value)) return value;
    matcher.embedded.lastIndex = 0;
    return value.replace(matcher.embedded, "{api-version}");
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
