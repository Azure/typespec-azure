import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// -----------------------------------------------------------------------------
// Downstream CI target configuration.
//
// The single source of truth is `detect-affected.config.json` (loaded below).
// Upstream *package* dependencies are NOT listed there: they are derived from
// the real pnpm workspace graph (`getAffectedPackages`, via
// `pnpm --filter "...[base]"`). The config only declares what the graph cannot
// express (ignore globs, shared/extra CI-infra paths, the submodule path, and
// the target -> package mapping).
//
// TO ADD A NEW TARGET (e.g. `go`):
//   1. Add an entry to `targets` in `detect-affected.config.json`.
//   2. Add a reusable `.github/workflows/ci-<id>.yml` (on: workflow_call).
//   3. Add a job + gate `needs:` entry in `.github/workflows/ci-downstream.yml`.
// No changes to this file (or its test) are needed — both are config-driven.
//
// TO ADD A NEW UPSTREAM LIBRARY (e.g. a new typespec-azure-* package that an
// emitter depends on): nothing to do — the workspace graph picks it up
// automatically as soon as the emitter declares the dependency. The same is true
// for third-party upstreams consumed through the pnpm *catalog* (e.g.
// `@typespec/http-client-python`): those live in the root `pnpm-workspace.yaml`,
// which pnpm's own change detection attributes to the root package only, so they
// are handled separately by `getCatalogAffectedPackages` below.
// -----------------------------------------------------------------------------

interface Target {
  /** Workspace package name whose graph dependents identify this emitter. */
  package: string;
  /** Extra paths (outside any package) that should trigger this target. */
  extra?: string[];
}

interface Config {
  /** Git path that changes when the git-submodule pointer moves (triggers all targets). */
  submodulePath: string;
  /** Root pnpm workspace file holding the dependency `catalog:` (see `getCatalogAffectedPackages`). */
  catalogPath: string;
  /** Globs whose sole change should NOT trigger anything; passed to pnpm via `--changed-files-ignore-pattern`. */
  ignore: string[];
  /** Paths that trigger every target (shared CI infrastructure). */
  sharedExtra: string[];
  targets: Record<string, Target>;
}

export const CONFIG: Config = JSON.parse(
  readFileSync(new URL("./detect-affected.config.json", import.meta.url), "utf8"),
);

/**
 * Run pnpm and return stdout. On Windows pnpm is `pnpm.cmd`, which Node refuses
 * to spawn without a shell (EINVAL); on Linux/macOS CI it is a real binary.
 */
function runPnpm(args: string[]): string {
  const isWindows = process.platform === "win32";
  return execFileSync(isWindows ? "pnpm.cmd" : "pnpm", args, {
    encoding: "utf8",
    shell: isWindows,
  });
}

/**
 * Match a file against an `extra` path pattern. Only two forms are supported,
 * because that is all the non-package CI-infra paths ever need:
 *   - `dir/**`  — the file is `dir` or lives anywhere under it.
 *   - exact     — the file path equals the pattern.
 * (Test/markdown ignore globs are handled by pnpm, not here.)
 */
export function matchesAny(file: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern.endsWith("/**")) {
      const prefix = pattern.slice(0, -3);
      return file === prefix || file.startsWith(prefix + "/");
    }
    return file === pattern;
  });
}

/**
 * ---------------------------------------------------------------------------
 * Catalog support
 * ---------------------------------------------------------------------------
 * Third-party upstreams such as `@typespec/http-client-python` are NOT workspace
 * packages (they are excluded in `pnpm-workspace.yaml` and installed from npm).
 * Packages depend on them through the pnpm catalog:
 *
 *   pnpm-workspace.yaml:  catalog: { "@typespec/http-client-python": ">=0.35.0 <1.0.0" }
 *   package.json:         "@typespec/http-client-python": "catalog:"
 *
 * Bumping such a dependency therefore only edits root-level files, and
 * `pnpm --filter "...[base]"` attributes that change to the root package alone —
 * no emitter is reported as affected (Azure/typespec-azure#5010). The helpers
 * below recover the missing edge: diff the catalog, find the packages that
 * consume the changed entries, then let pnpm expand their dependents.
 *
 * Only `catalog:`/`catalogs:` are considered. Other `pnpm-workspace.yaml` keys
 * (`overrides`, `packages`, `allowBuilds`, ...) deliberately trigger nothing.
 */

/** Catalog name used by the unnamed (default) `catalog:` block. */
const DEFAULT_CATALOG = "default";

/** Stable key for one catalog entry, so entries can live in a single Set. */
export function catalogEntryKey(catalog: string, dependency: string): string {
  return `${catalog}\u0000${dependency}`;
}

/**
 * Extract the `catalog:` / `catalogs:` blocks from `pnpm-workspace.yaml`.
 *
 * Hand-rolled rather than using a YAML library on purpose: the detect-affected
 * job runs before any `pnpm install`, so no third-party module is available. The
 * supported subset is exactly what pnpm allows here — flat `key: value` maps,
 * optionally quoted, nested one extra level under `catalogs:`.
 *
 * @returns catalog name (`"default"` for the unnamed block) -> dependency -> version range.
 */
export function parseCatalogs(text: string): Map<string, Map<string, string>> {
  const catalogs = new Map<string, Map<string, string>>();
  let topKey: string | undefined;
  let namedCatalog: string | undefined;

  const entryOf = (catalog: string) => {
    let map = catalogs.get(catalog);
    if (!map) catalogs.set(catalog, (map = new Map()));
    return map;
  };

  for (const line of text.split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const indent = line.length - line.trimStart().length;
    const parsed = parseMappingLine(line);

    if (indent === 0) {
      topKey = parsed?.key;
      namedCatalog = undefined;
      continue;
    }
    if (!parsed) continue; // sequence item (`- foo`) or anything else we don't model

    if (topKey === "catalog" && indent === 2) {
      entryOf(DEFAULT_CATALOG).set(parsed.key, parsed.value);
    } else if (topKey === "catalogs") {
      if (indent === 2 && parsed.value === "") {
        namedCatalog = parsed.key;
      } else if (indent === 4 && namedCatalog !== undefined) {
        entryOf(namedCatalog).set(parsed.key, parsed.value);
      }
    }
  }
  return catalogs;
}

/** Parse a single `key: value` YAML line; returns undefined for non-mapping lines. */
function parseMappingLine(line: string): { key: string; value: string } | undefined {
  const match = /^\s*(?:"([^"]*)"|'([^']*)'|([^\s:#][^:]*?))\s*:(?:\s+(.*))?$/.exec(line);
  if (!match) return undefined;
  const key = match[1] ?? match[2] ?? match[3];
  return { key, value: unquote(match[4] ?? "") };
}

function unquote(value: string): string {
  const trimmed = value.trim();
  const quoted = /^"([^"]*)"$|^'([^']*)'$/.exec(trimmed);
  return quoted ? (quoted[1] ?? quoted[2]) : trimmed;
}

/**
 * Catalog entries whose version changed between two `pnpm-workspace.yaml`
 * revisions. Additions, removals and edits all count; an entry that only moved
 * does not.
 *
 * @param baseText Base revision content, or undefined when the file did not exist.
 */
export function diffCatalogs(baseText: string | undefined, headText: string): Set<string> {
  const base = baseText === undefined ? new Map() : parseCatalogs(baseText);
  const head = parseCatalogs(headText);
  const changed = new Set<string>();

  for (const [catalog, entries] of head) {
    const before = base.get(catalog);
    for (const [dependency, version] of entries) {
      if (before?.get(dependency) !== version) changed.add(catalogEntryKey(catalog, dependency));
    }
  }
  for (const [catalog, entries] of base) {
    const after = head.get(catalog);
    for (const dependency of entries.keys()) {
      if (!after?.has(dependency)) changed.add(catalogEntryKey(catalog, dependency));
    }
  }
  return changed;
}

/** Catalog referenced by a package.json specifier, or undefined if it is not a catalog reference. */
export function catalogOfSpecifier(specifier: string): string | undefined {
  if (typeof specifier !== "string" || !specifier.startsWith("catalog:")) return undefined;
  // `catalog:` and `catalog:default` both mean the unnamed catalog.
  return specifier.slice("catalog:".length).trim() || DEFAULT_CATALOG;
}

interface Manifest {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

/**
 * Workspace packages that directly consume at least one of the changed catalog
 * entries. Dependents are added later by pnpm, from the real graph.
 */
export function packagesUsingCatalogEntries(
  manifests: Manifest[],
  changedEntries: Set<string>,
): Set<string> {
  const consumers = new Set<string>();
  if (changedEntries.size === 0) return consumers;

  for (const manifest of manifests) {
    if (!manifest.name) continue;
    const groups = [
      manifest.dependencies,
      manifest.devDependencies,
      manifest.peerDependencies,
      manifest.optionalDependencies,
    ];
    for (const group of groups) {
      for (const [dependency, specifier] of Object.entries(group ?? {})) {
        const catalog = catalogOfSpecifier(specifier);
        if (catalog !== undefined && changedEntries.has(catalogEntryKey(catalog, dependency))) {
          consumers.add(manifest.name);
        }
      }
    }
  }
  return consumers;
}

/**
 * Decide which targets are affected. Pure: all git/pnpm I/O happens in the caller.
 *
 * A target fires on any of three signals: its package is in the pnpm-derived
 * affected set, OR one of the two things the graph cannot see changed — the
 * `core` submodule pointer (which every emitter depends on, so it triggers all
 * targets), or a non-package `extra` CI-infra path.
 *
 * @param affectedPackages Target package OR any graph-dependent of a meaningfully
 *   changed package (from `pnpm --filter "...[base]"`), plus consumers of changed
 *   catalog entries and their dependents (from `getCatalogAffectedPackages`).
 * @param changedFiles Full changed-file list, used only for the two non-graph
 *   signals (`core` submodule + `extra` paths).
 */
export function computeAffected(
  affectedPackages: Set<string>,
  changedFiles: string[],
  config: Config,
): Record<string, boolean> {
  const submoduleChanged = changedFiles.includes(config.submodulePath);
  const result: Record<string, boolean> = {};
  for (const [name, target] of Object.entries(config.targets)) {
    const extra = [...config.sharedExtra, ...(target.extra ?? [])];
    result[name] =
      affectedPackages.has(target.package) || // pnpm workspace graph
      submoduleChanged || // non-graph: core submodule (all emitters depend on it)
      changedFiles.some((file) => matchesAny(file, extra)); // non-graph: CI-infra paths
  }
  return result;
}

function getChangedFiles(base: string, head: string): string[] {
  return execFileSync("git", ["diff", "--name-only", base, head], { encoding: "utf8" })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Return the workspace packages affected since `base`: every package with a
 * meaningful change plus all of its graph dependents. Change detection, dependent
 * expansion, and test/markdown filtering are all delegated to pnpm:
 *
 *   pnpm --filter "...[<base>]" --changed-files-ignore-pattern <glob> list --depth -1 --json
 *
 * `...[base]` diffs `base` against the working tree (in CI the checkout is HEAD,
 * so this is `base..HEAD`). Each `ignore` glob is passed as its own
 * `--changed-files-ignore-pattern`; a package whose only changes match those
 * globs is not reported.
 */
function getAffectedPackages(base: string, ignore: string[]): Set<string> {
  const args = ["--filter", `...[${base}]`];
  for (const glob of ignore) args.push("--changed-files-ignore-pattern", glob);
  args.push("list", "--depth", "-1", "--json");
  return new Set(listPackageNames(args));
}

function listPackageNames(args: string[]): string[] {
  const out = runPnpm(args).trim();
  if (!out) return [];
  const parsed = JSON.parse(out) as Array<{ name?: string }>;
  return parsed.map((p) => p.name).filter((n): n is string => Boolean(n));
}

/** Content of `path` at `rev`, or undefined when it does not exist there. */
function getFileAtRev(rev: string, path: string): string | undefined {
  try {
    return execFileSync("git", ["show", `${rev}:${path}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return undefined;
  }
}

/** Every workspace package.json, read from the checked-out working tree. */
function readWorkspaceManifests(): Manifest[] {
  const out = runPnpm(["list", "-r", "--depth", "-1", "--json"]).trim();
  if (!out) return [];
  const projects = JSON.parse(out) as Array<{ path?: string }>;
  const manifests: Manifest[] = [];
  for (const project of projects) {
    if (!project.path) continue;
    try {
      manifests.push(JSON.parse(readFileSync(join(project.path, "package.json"), "utf8")));
    } catch {
      // A project without a readable manifest cannot consume a catalog entry.
    }
  }
  return manifests;
}

/** Expand a set of packages to include all of their workspace dependents. */
function expandDependents(packages: Set<string>): Set<string> {
  if (packages.size === 0) return packages;
  const args: string[] = [];
  for (const name of packages) args.push("--filter", `...${name}`);
  args.push("list", "--depth", "-1", "--json");
  return new Set([...packages, ...listPackageNames(args)]);
}

/**
 * Packages affected by a change to the root catalog: the direct consumers of the
 * changed catalog entries plus all of their dependents. Empty unless
 * `config.catalogPath` is among the changed files.
 */
function getCatalogAffectedPackages(
  base: string,
  head: string,
  changedFiles: string[],
): Set<string> {
  if (!changedFiles.includes(CONFIG.catalogPath)) return new Set();
  const headText = getFileAtRev(head, CONFIG.catalogPath);
  if (headText === undefined) return new Set(); // catalog deleted: no consumer can resolve
  const changedEntries = diffCatalogs(getFileAtRev(base, CONFIG.catalogPath), headText);
  return expandDependents(packagesUsingCatalogEntries(readWorkspaceManifests(), changedEntries));
}

// CLI entry: run only when executed directly (not when imported by tests).
// Compare URLs (not paths) so separator/format differences never matter.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const base = process.env.BASE_SHA;
  const head = process.env.HEAD_SHA || "HEAD";
  if (!base) {
    console.error("ERROR: BASE_SHA env var is required");
    process.exit(1);
  }

  const changedFiles = getChangedFiles(base, head);
  const affectedPackages = new Set([
    ...getAffectedPackages(base, CONFIG.ignore),
    ...getCatalogAffectedPackages(base, head, changedFiles),
  ]);
  const affected = computeAffected(affectedPackages, changedFiles, CONFIG);

  console.log(`Base: ${base}`);
  console.log(`Head: ${head}`);
  console.log(`Changed files (${changedFiles.length}):`);
  for (const f of changedFiles) console.log(`  ${f}`);
  console.log(`Affected packages: ${[...affectedPackages].join(", ") || "(none)"}`);
  console.log("Affected targets:", JSON.stringify(affected));

  const outPath = process.env.GITHUB_OUTPUT;
  if (outPath) {
    // Single JSON output; consumers gate on `fromJSON(...).<target>` so the
    // workflow never enumerates target names.
    appendFileSync(outPath, `affected=${JSON.stringify(affected)}\n`);
  }
}
