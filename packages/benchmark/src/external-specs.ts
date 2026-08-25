/* eslint-disable no-console */
import { execFileSync } from "child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import { basename, join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
/** Root where external spec repositories are sparse-checked-out. */
const EXTERNAL_ROOT = resolve(__dirname, "..", "..", ".external");

/** File name of the source config inside an external spec directory. */
export const EXTERNAL_SPEC_CONFIG = "spec.json";
/** File name of the tspconfig copied into the checkout. */
const TSPCONFIG = "tspconfig.yaml";

/**
 * Source config for an external spec, stored as `spec.json` inside the spec's
 * directory (e.g. `external-spec/web/spec.json`). The sibling `tspconfig.yaml`
 * in the same directory controls the emitters and linter to measure. External
 * specs are sparse-checked-out from another repository and compiled against
 * this workspace's packages.
 */
export interface ExternalSpecConfig {
  /** Git URL of the repository to sparse-checkout (e.g. azure-rest-api-specs). */
  repository: string;
  /** Git branch or tag to check out. Defaults to "main". Tracks latest (no pinning). */
  ref?: string;
  /** Entry directory (containing main.tsp), relative to the repository root. */
  path: string;
  /**
   * Directory to sparse-checkout, relative to the repository root. Defaults to
   * `path`. Set to a parent directory when the spec imports sibling folders
   * (e.g. `../common`).
   */
  checkoutPath?: string;
  /** Benchmark name (defaults to the spec directory name). */
  name?: string;
}

/** An external spec config with its resolved name and source directory. */
export interface NamedExternalSpecConfig extends ExternalSpecConfig {
  name: string;
  /** The local directory holding `spec.json` and `tspconfig.yaml`. */
  sourceDir: string;
}

/** A resolved external spec ready to be benchmarked. */
export interface ResolvedExternalSpec {
  name: string;
  dir: string;
}

function git(cwd: string, args: string[]): void {
  execFileSync("git", args, { cwd, stdio: "inherit" });
}

/** Derive a stable, filesystem-safe directory name for a repository URL. */
function repoDirName(repository: string): string {
  return basename(repository).replace(/\.git$/, "") || "external-repo";
}

/**
 * Clone (or reuse) a repository using a sparse checkout limited to the given
 * paths. The checkout lives under `packages/benchmark/.external/<repo>` so that
 * TypeSpec imports resolve to this workspace's packages, letting the benchmark
 * measure the impact of local source changes on external specs.
 */
function sparseCheckout(repository: string, ref: string, paths: string[]): string {
  const dest = join(EXTERNAL_ROOT, repoDirName(repository));

  mkdirSync(EXTERNAL_ROOT, { recursive: true });

  if (!existsSync(join(dest, ".git"))) {
    console.log(`Cloning ${repository} (sparse, ref ${ref}) into ${dest}...`);
    git(EXTERNAL_ROOT, [
      "clone",
      "--filter=blob:none",
      "--no-checkout",
      "--depth",
      "1",
      "--branch",
      ref,
      repository,
      dest,
    ]);
    git(dest, ["sparse-checkout", "init", "--cone"]);
    git(dest, ["sparse-checkout", "set", ...paths]);
    git(dest, ["checkout", ref]);
  } else {
    console.log(`Reusing existing checkout at ${dest} (fetching ref ${ref})...`);
    git(dest, ["fetch", "--depth", "1", "origin", ref]);
    git(dest, ["sparse-checkout", "set", ...paths]);
    // Check out the freshly fetched commit (not a stale local branch) so the
    // reuse path always lands on the latest of `ref`. --force discards any
    // tspconfig.yaml we copied into the checkout on a previous run.
    git(dest, ["checkout", "--force", "FETCH_HEAD"]);
  }

  return dest;
}

/** Load and validate an external spec's `spec.json` from its directory. */
export function loadExternalSpecConfig(specDir: string): NamedExternalSpecConfig {
  const configFile = join(specDir, EXTERNAL_SPEC_CONFIG);
  const config = JSON.parse(readFileSync(configFile, "utf-8")) as ExternalSpecConfig;
  if (!config.repository) {
    throw new Error(`External spec config ${configFile} is missing "repository"`);
  }
  if (!config.path) {
    throw new Error(`External spec config ${configFile} is missing "path"`);
  }
  const name = config.name ?? basename(specDir);
  return { ...config, name, sourceDir: specDir };
}

/**
 * Resolve external specs: sparse-checkout their sources (grouped per
 * repository+ref so a shared repo is cloned once), copy each spec's
 * `tspconfig.yaml` into the checkout so the compiler uses our emitter/linter
 * config, and return each as a spec ready to benchmark. Fails if any spec's
 * entry directory has no main.tsp.
 */
export function resolveExternalSpecs(configs: NamedExternalSpecConfig[]): ResolvedExternalSpec[] {
  // Group by repository + ref so a shared repo is checked out once.
  const groups = new Map<string, NamedExternalSpecConfig[]>();
  for (const config of configs) {
    const ref = config.ref ?? "main";
    const key = `${config.repository}\n${ref}`;
    const group = groups.get(key);
    if (group) {
      group.push(config);
    } else {
      groups.set(key, [config]);
    }
  }

  const resolved: ResolvedExternalSpec[] = [];
  for (const [key, groupConfigs] of groups) {
    const [repository, ref] = key.split("\n");
    const paths = groupConfigs.map((c) => c.checkoutPath ?? c.path);
    const checkoutDir = sparseCheckout(repository, ref, paths);

    for (const config of groupConfigs) {
      const dir = join(checkoutDir, config.path);
      if (!existsSync(join(dir, "main.tsp"))) {
        throw new Error(
          `External spec "${config.name}" has no main.tsp at ${dir}. ` +
            `Check "path"/"checkoutPath" and that the sparse checkout succeeded.`,
        );
      }
      // Copy our tspconfig.yaml into the checkout entry dir (overwriting the
      // repo's) so the compiler uses our emitters/linter. Done after checkout
      // so it isn't discarded by the checkout above.
      const tspconfig = join(config.sourceDir, TSPCONFIG);
      if (existsSync(tspconfig)) {
        copyFileSync(tspconfig, join(dir, TSPCONFIG));
      }
      resolved.push({ name: config.name, dir });
    }
  }

  return resolved;
}
