/* eslint-disable no-console */
/**
 * Language-agnostic helpers for the SDK generated-code smoke tests.
 * Every language emitter's `regenerate-smoke` command calls these so config
 * parsing, spec fetching, and diff-checking are written once.
 */
import { execFileSync } from "child_process";
import { access, mkdir, readFile, rm } from "fs/promises";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

export interface SmokeService {
  /** Snapshot folder name. */
  name: string;
  /** Folder inside the spec repo containing the tsp entrypoint. */
  specPath: string;
  /** Coverage metadata; not used by tooling. */
  scenarios?: string[];
}

export interface SmokeConfig {
  specRepo: string;
  /** One commit that ALL services are fetched from. */
  commit: string;
  services: SmokeService[];
}

async function exists(p: string): Promise<boolean> {
  return access(p).then(
    () => true,
    () => false,
  );
}

/** Absolute path to `smoke-test/smoke-test-config.json`. */
export function defaultConfigPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "smoke-test-config.json");
}

export async function loadConfig(path: string = defaultConfigPath()): Promise<SmokeConfig> {
  const raw = JSON.parse(await readFile(path, "utf8"));
  if (typeof raw.commit !== "string" || raw.commit.length === 0) {
    throw new Error(`smoke-test config ${path}: missing "commit"`);
  }
  if (!Array.isArray(raw.services)) {
    throw new Error(`smoke-test config ${path}: "services" must be an array`);
  }
  for (const [i, svc] of raw.services.entries()) {
    if (typeof svc.name !== "string" || svc.name.length === 0) {
      throw new Error(`smoke-test config ${path}: services[${i}] missing "name"`);
    }
    if (typeof svc.specPath !== "string" || svc.specPath.length === 0) {
      throw new Error(`smoke-test config ${path}: services[${i}] missing "specPath"`);
    }
  }
  return raw as SmokeConfig;
}

/**
 * Return the tsp entrypoint inside `serviceDir`, preferring `client.tsp` over
 * `main.tsp` (matching the regenerate harness).
 */
export async function resolveEntrypoint(serviceDir: string): Promise<string> {
  const client = resolve(serviceDir, "client.tsp");
  const main = resolve(serviceDir, "main.tsp");
  if (await exists(client)) return client;
  if (await exists(main)) return main;
  throw new Error(`smoke-test: no client.tsp or main.tsp in ${serviceDir}`);
}

export interface ServiceManifest {
  name: string;
  /** Absolute path to the fetched service directory. */
  serviceDir: string;
  /** Absolute path to the tsp entrypoint (client.tsp or main.tsp). */
  entrypoint: string;
}

/** Commit-keyed cache dir: `smoke-test/.specs-cache/<commit>`. */
export function cacheDirForCommit(commit: string): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, ".specs-cache", commit);
}

/** Build a manifest entry from an already-present local service dir. */
export async function resolveManifestForLocalDir(
  cacheRoot: string,
  svc: SmokeService,
): Promise<ServiceManifest> {
  const serviceDir = resolve(cacheRoot, svc.specPath);
  const entrypoint = await resolveEntrypoint(serviceDir);
  return { name: svc.name, serviceDir, entrypoint };
}

/**
 * Sparse, shallow checkout of `config.commit` from the spec repo into
 * `smoke-test/.specs-cache/<commit>/`, pulling only the configured `specPath`s
 * plus shared `common-types`. Cached by commit SHA. Returns one manifest per
 * service. Requires `git` on PATH.
 */
export async function fetchSpecs(config: SmokeConfig): Promise<ServiceManifest[]> {
  const cacheDir = cacheDirForCommit(config.commit);
  const git = (args: string[]) =>
    execFileSync("git", args, { cwd: cacheDir, stdio: ["ignore", "ignore", "inherit"] });

  if (!(await exists(join(cacheDir, ".git")))) {
    await rm(cacheDir, { recursive: true, force: true });
    await mkdir(cacheDir, { recursive: true });
    const url = `https://github.com/${config.specRepo}.git`;
    git(["init", "--quiet"]);
    git(["remote", "add", "origin", url]);
    git(["sparse-checkout", "init", "--cone"]);
    const sparsePaths = [
      "specification/common-types",
      ...config.services.map((s) => s.specPath),
    ];
    git(["sparse-checkout", "set", ...sparsePaths]);
    git(["fetch", "--depth", "1", "origin", config.commit]);
    git(["checkout", "--quiet", "FETCH_HEAD"]);
  }

  const manifests: ServiceManifest[] = [];
  for (const svc of config.services) {
    manifests.push(await resolveManifestForLocalDir(cacheDir, svc));
  }
  return manifests;
}

export interface DiffResult {
  clean: boolean;
  /** The `git diff` text (empty when clean). */
  diff: string;
}

/**
 * Diff-check the committed snapshot: returns `clean=false` if regeneration
 * produced any change (tracked or untracked) under `relSnapshotDir`, relative
 * to `repoRoot`. Mirrors the `check-for-changed-files` contract.
 */
export async function checkDiff(repoRoot: string, relSnapshotDir: string): Promise<DiffResult> {
  const runCapture = (args: string[]) =>
    execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" });

  // Tracked changes.
  const tracked = runCapture(["diff", "--", relSnapshotDir]);
  // Untracked new files inside the snapshot dir.
  const untracked = runCapture([
    "ls-files",
    "--others",
    "--exclude-standard",
    "--",
    relSnapshotDir,
  ]);

  const diff = [tracked, untracked].filter((s) => s.trim().length > 0).join("\n");
  return { clean: diff.trim().length === 0, diff };
}
