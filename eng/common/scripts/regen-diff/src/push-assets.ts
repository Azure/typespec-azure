/* eslint-disable no-console */
/**
 * Publishes the current generated output as a new baseline in the external
 * assets repo and bumps `assets.json` to the new tag. Shared across emitter
 * languages; the generated dir, flavor folders and commit-label come from the
 * package's `regen-diff.config.json`.
 *
 * This is a **maintainer-run, local** tool. It pushes to the assets repo using
 * whatever git credentials are already configured on the machine (or a
 * `GH_TOKEN`/`GITHUB_TOKEN` env var if present), so it needs **no CI secret**.
 *
 * Typical flow:
 *   1. <regenerate>                     # produce fresh generated output
 *   2. regenerate:push-assets           # publish it + bump assets.json
 *   3. commit the assets.json change and open a PR
 *
 * Usage:
 *   push-assets --package <dir> [--message "<msg>"] [--branch <name>] [--dry-run]
 */

import { execFileSync } from "child_process";
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { cp, mkdir, mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import { dirname, join } from "path";
import pc from "picocolors";

import { assetsRepoUrl, readAssetsConfig } from "./assets.js";
import { readRegenDiffConfig } from "./config.js";

export interface PushOptions {
  packageRoot: string;
  message?: string;
  branch?: string;
  dryRun?: boolean;
}

/** Returns an authenticated push URL when a token is in the environment. */
function pushUrl(repoSlug: string): string {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (token) {
    return `https://x-access-token:${token}@github.com/${repoSlug}.git`;
  }
  return `https://github.com/${repoSlug}.git`;
}

/**
 * Recursively rewrites every text file under `dir` with all `\r` bytes removed,
 * so the stored baseline is pure LF regardless of the maintainer's OS. Files
 * containing a NUL byte are treated as binary and left untouched.
 */
function normalizeEol(dir: string): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      normalizeEol(full);
    } else if (entry.isFile()) {
      const buf = readFileSync(full);
      if (buf.includes(0)) continue; // binary
      if (buf.includes(0x0d)) {
        writeFileSync(full, buf.toString("utf8").replace(/\r/g, ""));
      }
    }
  }
}

/**
 * Removes transient codegen handoff files (configured via `pruneFilePrefixes`)
 * that embed absolute, machine-local paths and must never be published into the
 * portable baseline.
 */
function pruneIntermediates(dir: string, prefixes: string[]): void {
  if (prefixes.length === 0) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      pruneIntermediates(full, prefixes);
    } else if (entry.isFile() && prefixes.some((p) => entry.name.startsWith(p))) {
      rmSync(full, { force: true });
    }
  }
}

/** Publishes the current generated output as a new baseline + tag. */
export async function pushAssets(options: PushOptions): Promise<void> {
  const cfg = readRegenDiffConfig(options.packageRoot);
  const generatedDir = join(cfg.packageRoot, ...cfg.generatedDir.split("/"));
  const branch = options.branch ?? "main";
  const dryRun = options.dryRun ?? false;

  const config = readAssetsConfig(cfg.packageRoot);
  if (!config) {
    throw new Error(`No usable assets.json found at ${cfg.packageRoot}/assets.json`);
  }

  // Validate the generated output is present.
  for (const flavor of cfg.flavors) {
    if (!existsSync(join(generatedDir, flavor))) {
      throw new Error(
        `Missing ${join(generatedDir, flavor)}. Run the package's regenerate step before pushing assets.`,
      );
    }
  }

  const repoUrl = assetsRepoUrl(config);
  const tempDir = await mkdtemp(join(tmpdir(), "typespec-assets-push-"));

  try {
    const git = (args: string[], opts: { allowFail?: boolean } = {}) => {
      try {
        return execFileSync("git", args, {
          cwd: tempDir,
          stdio: ["ignore", "pipe", "inherit"],
          encoding: "utf8",
        }).trim();
      } catch (err) {
        if (opts.allowFail) return "";
        throw err;
      }
    };

    console.log(pc.cyan(`Preparing assets push to ${config.assetsRepo} (branch ${branch})`));

    git(["init"]);
    git(["config", "core.longpaths", "true"]);
    // Store the baseline with LF regardless of the maintainer's OS.
    git(["config", "core.autocrlf", "false"]);
    git(["remote", "add", "origin", repoUrl]);

    // Try to base the new commit on the existing branch; if the repo/branch is
    // empty this fails harmlessly and we start an orphan history.
    const fetched = git(["fetch", "--depth", "1", "origin", branch], { allowFail: true });
    if (fetched !== "" || git(["rev-parse", "--verify", "FETCH_HEAD"], { allowFail: true })) {
      git(["checkout", "-B", branch, "FETCH_HEAD"], { allowFail: true });
    }
    if (!git(["rev-parse", "--verify", "HEAD"], { allowFail: true })) {
      git(["checkout", "--orphan", branch], { allowFail: true });
    }

    // Replace the per-flavor baseline under <prefix>/ with the fresh output.
    const prefixRoot = config.prefixPath ? join(tempDir, ...config.prefixPath.split("/")) : tempDir;
    for (const flavor of cfg.flavors) {
      const dest = join(prefixRoot, flavor);
      rmSync(dest, { recursive: true, force: true });
      await mkdir(dirname(dest), { recursive: true });
      await cp(join(generatedDir, flavor), dest, { recursive: true });
    }

    // Normalize line endings to LF in the committed blobs.
    writeFileSync(join(tempDir, ".gitattributes"), "* text=auto eol=lf\n");
    normalizeEol(prefixRoot);
    pruneIntermediates(prefixRoot, cfg.pruneFilePrefixes);

    git(["add", "-A"]);
    const status = git(["status", "--porcelain"], { allowFail: true });
    if (!status) {
      console.log(pc.green("Baseline already up to date in the assets repo; nothing to push."));
      return;
    }

    const message =
      options.message ??
      `[${cfg.slug}] Update generated test baseline (${new Date().toISOString()})`;
    git(["config", "user.name", process.env.GIT_AUTHOR_NAME || "typespec-assets-bot"]);
    git([
      "config",
      "user.email",
      process.env.GIT_AUTHOR_EMAIL || "typespec-assets-bot@users.noreply.github.com",
    ]);
    git(["commit", "-m", message]);

    const shortSha = git(["rev-parse", "--short=10", "HEAD"]);
    const tag = `${config.tagPrefix}_${shortSha}`;
    git(["tag", tag]);

    if (dryRun) {
      console.log(pc.yellow(`[dry-run] Would push branch ${branch} and tag ${tag}.`));
    } else {
      const authUrl = pushUrl(config.assetsRepo);
      git(["remote", "set-url", "origin", authUrl]);
      git(["push", "origin", `HEAD:${branch}`]);
      git(["push", "origin", tag]);
      console.log(pc.green(`Pushed baseline and tag ${tag} to ${config.assetsRepo}.`));
    }

    // Bump assets.json's Tag locally so the maintainer can commit it.
    bumpAssetsTag(config.configPath, tag);
    console.log(pc.green(`Updated ${config.configPath} -> "Tag": "${tag}"`));
    console.log(pc.cyan(`Next: commit assets.json and open a PR.`));
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

/** Rewrites only the `Tag` field of assets.json, preserving the other fields. */
function bumpAssetsTag(configPath: string, tag: string): void {
  const raw = readFileSync(configPath, "utf8");
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  parsed.Tag = tag;
  writeFileSync(configPath, JSON.stringify(parsed, null, 2) + "\n");
}
