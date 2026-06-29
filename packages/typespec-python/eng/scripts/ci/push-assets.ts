/* eslint-disable no-console */
/**
 * Publishes the current `tests/generated/{azure,unbranded}` output as a new
 * baseline in the external assets repo and bumps `assets.json` to the new tag.
 *
 * This is a **maintainer-run, local** tool. It pushes to the assets repo using
 * whatever git credentials are already configured on the machine (or a
 * `GH_TOKEN`/`GITHUB_TOKEN` env var if present), so it needs **no CI secret**.
 *
 * Typical flow:
 *   1. `npm run regenerate`            # produce fresh tests/generated output
 *   2. `npm run regenerate:push-assets`  # publish it + bump assets.json
 *   3. commit the assets.json change and open a PR
 *
 * Usage:
 *   tsx ./eng/scripts/ci/push-assets.ts [--message "<msg>"] [--branch <name>] [--dry-run]
 */

import { execFileSync } from "child_process";
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { cp, mkdir, mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import { dirname, join, resolve } from "path";
import pc from "picocolors";
import { fileURLToPath } from "url";
import { parseArgs } from "util";

import { assetsRepoUrl, FLAVORS, readAssetsConfig } from "./assets.js";

const argv = parseArgs({
  args: process.argv.slice(2),
  options: {
    message: { type: "string", short: "m" },
    branch: { type: "string", short: "b" },
    "dry-run": { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
});

if (argv.values.help) {
  console.log(`
${pc.bold("Usage:")} tsx push-assets.ts [options]

Publishes tests/generated/{azure,unbranded} to the assets repo named in
assets.json, creates a new tag, pushes it, and bumps assets.json's "Tag".

${pc.bold("Options:")}
  -m, --message <msg>   Commit message (default auto-generated).
  -b, --branch <name>   Assets-repo branch to push to (default: main).
      --dry-run         Build the commit/tag locally but do not push.
  -h, --help            Show this help.
`);
  process.exit(0);
}

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(SCRIPT_DIR, "../../../");
const GENERATED_DIR = resolve(PACKAGE_ROOT, "tests/generated");
const BRANCH = argv.values.branch ?? "main";
const DRY_RUN = argv.values["dry-run"] ?? false;

/** Returns an authenticated push URL when a token is in the environment. */
function pushUrl(repoSlug: string): string {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (token) {
    return `https://x-access-token:${token}@github.com/${repoSlug}.git`;
  }
  return `https://github.com/${repoSlug}.git`;
}

/**
 * Recursively rewrites every text file under `dir` with all `\r` bytes removed.
 * On Windows, Python writing `\r\n` to a text-mode file yields `\r\r\n` (double
 * CR); relying on git's `eol=lf` normalization can leave a stray inner CR, which
 * later shows up as spurious diff noise. Stripping all CR here guarantees the
 * stored baseline is pure LF regardless of the maintainer's OS. Files containing
 * a NUL byte are treated as binary and left untouched.
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
 * Removes transient codegen handoff files (`.tsp-codegen-*.json`) that the
 * TypeSpec emit step writes for the Python batch step. They embed absolute,
 * machine-local paths (e.g. a Windows temp dir) and are not real generated
 * output, so they must never be published into the portable baseline — for
 * legacy specs whose baseline is restored verbatim, a stale path here breaks
 * regeneration on other machines.
 */
function pruneIntermediates(dir: string): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      pruneIntermediates(full);
    } else if (entry.isFile() && entry.name.startsWith(".tsp-codegen-")) {
      rmSync(full, { force: true });
    }
  }
}

async function main(): Promise<void> {
  const config = readAssetsConfig(PACKAGE_ROOT);
  if (!config) {
    console.error(pc.red(`No usable assets.json found at ${PACKAGE_ROOT}/assets.json`));
    process.exit(1);
  }

  // Validate the generated output is present.
  for (const flavor of FLAVORS) {
    if (!existsSync(join(GENERATED_DIR, flavor))) {
      console.error(
        pc.red(
          `Missing ${join(GENERATED_DIR, flavor)}. Run "npm run regenerate" before pushing assets.`,
        ),
      );
      process.exit(1);
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

    console.log(pc.cyan(`Preparing assets push to ${config.assetsRepo} (branch ${BRANCH})`));

    git(["init"]);
    git(["config", "core.longpaths", "true"]);
    // Store the baseline with LF regardless of the maintainer's OS, so the diff
    // isn't swamped by CRLF-vs-LF noise when CI (Linux) regenerates with LF.
    git(["config", "core.autocrlf", "false"]);
    git(["remote", "add", "origin", repoUrl]);

    // Try to base the new commit on the existing branch; if the repo/branch is
    // empty this fails harmlessly and we start an orphan history.
    const fetched = git(["fetch", "--depth", "1", "origin", BRANCH], { allowFail: true });
    if (fetched !== "" || git(["rev-parse", "--verify", "FETCH_HEAD"], { allowFail: true })) {
      git(["checkout", "-B", BRANCH, "FETCH_HEAD"], { allowFail: true });
    }
    if (!git(["rev-parse", "--verify", "HEAD"], { allowFail: true })) {
      git(["checkout", "--orphan", BRANCH], { allowFail: true });
    }

    // Replace the per-flavor baseline under <prefix>/ with the fresh output.
    const prefixRoot = config.prefixPath ? join(tempDir, ...config.prefixPath.split("/")) : tempDir;
    for (const flavor of FLAVORS) {
      const dest = join(prefixRoot, flavor);
      rmSync(dest, { recursive: true, force: true });
      await mkdir(dirname(dest), { recursive: true });
      await cp(join(GENERATED_DIR, flavor), dest, { recursive: true });
    }

    // Normalize line endings to LF in the committed blobs (text=auto skips
    // detected binaries), so a Windows maintainer's CRLF files don't poison the
    // baseline. Written before `git add` so it applies to the staged files.
    writeFileSync(join(tempDir, ".gitattributes"), "* text=auto eol=lf\n");

    // Belt-and-suspenders: strip stray CR bytes (incl. Windows double-CR
    // `\r\r\n`) that git's eol=lf normalization can leave behind.
    normalizeEol(prefixRoot);

    // Drop transient codegen handoff files; they embed machine-local paths and
    // must not pollute the portable baseline.
    pruneIntermediates(prefixRoot);

    git(["add", "-A"]);
    const status = git(["status", "--porcelain"], { allowFail: true });
    if (!status) {
      console.log(pc.green("Baseline already up to date in the assets repo; nothing to push."));
      return;
    }

    const message =
      argv.values.message ??
      `[python] Update generated test baseline (${new Date().toISOString()})`;
    // Use a stable bot identity when none is configured locally.
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

    if (DRY_RUN) {
      console.log(pc.yellow(`[dry-run] Would push branch ${BRANCH} and tag ${tag}.`));
    } else {
      const authUrl = pushUrl(config.assetsRepo);
      git(["remote", "set-url", "origin", authUrl]);
      git(["push", "origin", `HEAD:${BRANCH}`]);
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

/** Rewrites only the `Tag` field of assets.json, preserving formatting. */
function bumpAssetsTag(configPath: string, tag: string): void {
  const raw = readFileSync(configPath, "utf8");
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  parsed.Tag = tag;
  writeFileSync(configPath, JSON.stringify(parsed, null, 2) + "\n");
}

main().catch((err) => {
  console.error(pc.red(`Fatal error: ${err?.stack ?? err}`));
  process.exit(1);
});
