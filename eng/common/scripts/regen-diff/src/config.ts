/* eslint-disable no-console */
/**
 * Loads a package's `regen-diff.config.json`, the per-language configuration for
 * the shared regen-diff tool. It sits next to the package's test-proxy-style
 * `assets.json` (which points at the external baseline) and describes the bits
 * that are specific to one emitter: where the generated output lives, which
 * top-level "flavor" folders make it up, and how to label the rendered diff.
 *
 * Example `regen-diff.config.json`:
 *   {
 *     "slug": "python",
 *     "title": "Python emitter — generated test diff",
 *     "generatedDir": "tests/generated",
 *     "flavors": ["azure", "unbranded"],
 *     "pruneFilePrefixes": [".tsp-codegen-"]
 *   }
 */

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

/** Resolved per-language regen-diff configuration. */
export interface RegenDiffConfig {
  /**
   * Short, URL/identifier-safe language slug (e.g. "python", "java", "csharp").
   * Used to namespace the Pages preview (`pr/<num>/<slug>/`), the commit-status
   * context (`regen-diff/<slug>`) and the sticky PR comment marker.
   */
  slug: string;
  /** Human-readable title shown on the diff page and the PR comment. */
  title: string;
  /** Generated-output directory, relative to the package root. */
  generatedDir: string;
  /** Top-level folders under `generatedDir` that make up the baseline. */
  flavors: string[];
  /**
   * Filename prefixes to drop from both sides before diffing (transient codegen
   * artifacts that embed machine-local paths and would otherwise be diff noise).
   */
  pruneFilePrefixes: string[];
  /** Absolute path to the package root the config was loaded from. */
  packageRoot: string;
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Reads and validates `<packageRoot>/regen-diff.config.json`. Throws a friendly
 * error if the file is missing or malformed, since every command needs it.
 */
export function readRegenDiffConfig(packageRoot: string): RegenDiffConfig {
  const root = resolve(packageRoot);
  const configPath = resolve(root, "regen-diff.config.json");
  if (!existsSync(configPath)) {
    throw new Error(
      `No regen-diff.config.json found at ${configPath}. ` +
        `See eng/common/scripts/regen-diff/README.md for the onboarding steps.`,
    );
  }

  const raw = JSON.parse(readFileSync(configPath, "utf8")) as Record<string, unknown>;

  const slug = typeof raw.slug === "string" ? raw.slug.trim() : "";
  if (!SLUG_RE.test(slug)) {
    throw new Error(
      `regen-diff.config.json: "slug" must match ${SLUG_RE} (got ${JSON.stringify(raw.slug)}).`,
    );
  }

  const flavors = Array.isArray(raw.flavors) ? raw.flavors.map((f) => String(f)) : [];
  if (flavors.length === 0) {
    throw new Error(`regen-diff.config.json: "flavors" must be a non-empty array of folder names.`);
  }

  const pruneFilePrefixes = Array.isArray(raw.pruneFilePrefixes)
    ? raw.pruneFilePrefixes.map((p) => String(p))
    : [];

  const title =
    typeof raw.title === "string" && raw.title.trim()
      ? raw.title.trim()
      : `${slug} emitter — generated test diff`;

  const generatedDir =
    typeof raw.generatedDir === "string" && raw.generatedDir.trim()
      ? raw.generatedDir.trim()
      : "tests/generated";

  return {
    slug,
    title,
    generatedDir,
    flavors,
    pruneFilePrefixes,
    packageRoot: root,
  };
}
