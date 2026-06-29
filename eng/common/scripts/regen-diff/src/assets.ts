/* eslint-disable no-console */
/**
 * Test-proxy-style baseline assets helpers, shared across emitter languages.
 *
 * The generated-test baseline ("the last accepted regeneration output") is
 * stored in an external, public assets repo and pinned by a tag, following the
 * Azure SDK test-proxy `assets.json` convention. Restoring the baseline is an
 * anonymous clone of that public repo, so it needs **no token**.
 *
 * `assets.json` (next to a package's `package.json`) looks like:
 *   {
 *     "AssetsRepo": "Azure/azure-sdk-assets",
 *     "AssetsRepoPrefixPath": "typespec/python",
 *     "TagPrefix": "typespec/python/tests",
 *     "Tag": "typespec/python/tests_<sha>"
 *   }
 *
 * In the assets repo the baseline lives under
 *   <AssetsRepoPrefixPath>/<flavor>
 * at the commit pointed to by <Tag>, one folder per configured flavor.
 */

import { execSync } from "child_process";
import { existsSync, readFileSync, rmSync } from "fs";
import { cp, mkdir, mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import { join, resolve } from "path";
import pc from "picocolors";

/** Parsed `assets.json` describing where the baseline lives. */
export interface AssetsConfig {
  /** "owner/repo" of the public assets repo. */
  assetsRepo: string;
  /** Subdirectory in the assets repo that contains the language baseline. */
  prefixPath: string;
  /** Tag namespace, e.g. "typespec/python/tests". */
  tagPrefix: string;
  /** Concrete tag the baseline is pinned to (empty until first bootstrap). */
  tag: string;
  /** Absolute path to the `assets.json` file this was read from. */
  configPath: string;
}

/**
 * Reads `assets.json` from `packageRoot`. Returns `undefined` if the file does
 * not exist or has no `AssetsRepo`, so callers can treat that as "no baseline".
 */
export function readAssetsConfig(packageRoot: string): AssetsConfig | undefined {
  const configPath = resolve(packageRoot, "assets.json");
  if (!existsSync(configPath)) {
    return undefined;
  }

  const raw = JSON.parse(readFileSync(configPath, "utf8")) as Record<string, string>;
  const assetsRepo = raw.AssetsRepo?.trim() ?? "";
  if (!assetsRepo) {
    return undefined;
  }

  return {
    assetsRepo,
    prefixPath: (raw.AssetsRepoPrefixPath ?? "").trim(),
    tagPrefix: (raw.TagPrefix ?? "").trim(),
    tag: (raw.Tag ?? "").trim(),
    configPath,
  };
}

/** HTTPS URL for the public assets repo (anonymous, no credentials). */
export function assetsRepoUrl(config: AssetsConfig): string {
  return `https://github.com/${config.assetsRepo}.git`;
}

/**
 * Anonymously checks out the assets repo at `config.tag` into a fresh temp dir
 * and invokes `handler` with the absolute path to `<tmp>/<prefixPath>` (the
 * directory that contains the per-flavor baseline folders). The temp dir is
 * always cleaned up afterwards.
 *
 * Throws if `config.tag` is empty (baseline not bootstrapped yet).
 */
export async function withBaselineCheckout<T>(
  config: AssetsConfig,
  handler: (baselineRoot: string) => Promise<T>,
): Promise<T> {
  if (!config.tag) {
    throw new Error(
      `assets.json has an empty "Tag"; bootstrap the baseline first ` +
        `(run "<your package> regenerate:push-assets").`,
    );
  }

  const repoUrl = assetsRepoUrl(config);
  const tempDir = await mkdtemp(join(tmpdir(), "typespec-assets-"));

  try {
    console.log(pc.dim(`Cloning ${config.assetsRepo}@${config.tag} into ${tempDir}`));
    const run = (cmd: string) =>
      execSync(cmd, { cwd: tempDir, stdio: ["ignore", "ignore", "inherit"] });

    run(`git init`);
    run(`git config core.longpaths true`);
    run(`git remote add origin ${repoUrl}`);
    if (config.prefixPath) {
      run(`git config core.sparseCheckout true`);
      run(`git sparse-checkout init --cone`);
      run(`git sparse-checkout set ${config.prefixPath}`);
    }
    // Fetch the specific tag shallowly. Tags are fetched under refs/tags/<tag>.
    run(`git fetch --depth 1 origin "refs/tags/${config.tag}:refs/tags/${config.tag}"`);
    run(`git checkout "tags/${config.tag}"`);

    const baselineRoot = config.prefixPath
      ? join(tempDir, ...config.prefixPath.split("/"))
      : tempDir;
    return await handler(baselineRoot);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * Restores the **full** baseline (every configured flavor folder) from the
 * assets repo into `destDir` as `destDir/<flavor>`. `destDir/<flavor>` is wiped
 * before copying. Used by the diff renderer to obtain the "before" snapshot.
 */
export async function restoreFullBaseline(
  config: AssetsConfig,
  destDir: string,
  flavors: string[],
): Promise<void> {
  await withBaselineCheckout(config, async (baselineRoot) => {
    for (const flavor of flavors) {
      const src = join(baselineRoot, flavor);
      const dest = join(destDir, flavor);
      if (!existsSync(src)) {
        console.warn(pc.yellow(`Baseline flavor folder not found in assets repo: ${flavor}`));
        continue;
      }
      rmSync(dest, { recursive: true, force: true });
      await mkdir(dest, { recursive: true });
      await cp(src, dest, { recursive: true });
    }
  });
}
