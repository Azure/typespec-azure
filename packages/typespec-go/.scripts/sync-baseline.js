// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.
//
// Maintains a local checkout of the generated-test baseline from
// https://github.com/Azure/azure-sdk-assets at branch `typespec-go`.
//
// After tspcompile.js finishes regeneration it mirrors the locally
// generated test artifacts into this checkout, so developers can
// `git diff` / `git status` inside temp/baseline to inspect codegen
// changes against the merged baseline.
//
// Skip with TYPESPEC_GO_SKIP_BASELINE=1 (used by CI / offline runs).

import { execFileSync } from "child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(scriptDir, "..");
const baselineDir = resolve(pkgRoot, "temp", "baseline");

export const BASELINE_REPO = "https://github.com/Azure/azure-sdk-assets.git";
export const BASELINE_BRANCH = "typespec-go";
// Top-level directories under packages/typespec-go/ that hold generated test
// artifacts and that should be mirrored into the baseline checkout. The same
// names are used as the top-level directories in the baseline repo so the
// layout mirrors 1:1.
export const BASELINE_MIRROR_DIRS = ["test/local", "test/http-specs", "test/azure-http-specs"];

export function isBaselineDisabled() {
  return process.env.TYPESPEC_GO_SKIP_BASELINE === "1";
}

function git(args, opts = {}) {
  return execFileSync("git", args, { stdio: "inherit", ...opts });
}

function gitQuiet(args, opts = {}) {
  return execFileSync("git", args, { stdio: ["ignore", "pipe", "pipe"], ...opts })
    .toString()
    .trim();
}

/**
 * Ensures temp/baseline holds a clean, blobless, shallow checkout of
 * `azure-sdk-assets@typespec-go`. Safe to call repeatedly: only re-fetches
 * when offline / dirty state requires it.
 *
 * Returns the absolute path to the baseline checkout, or null when the
 * baseline is disabled (TYPESPEC_GO_SKIP_BASELINE=1) or fetching failed.
 */
export function syncBaseline({ force = false } = {}) {
  if (isBaselineDisabled()) {
    return null;
  }

  try {
    mkdirSync(baselineDir, { recursive: true });

    if (!existsSync(resolve(baselineDir, ".git"))) {
      console.log(`Initializing baseline checkout at ${baselineDir}...`);
      git(["init", "--quiet"], { cwd: baselineDir });
      git(["remote", "add", "origin", BASELINE_REPO], { cwd: baselineDir });
      git(["config", "core.sparseCheckout", "true"], { cwd: baselineDir });
      git(["config", "extensions.partialClone", "origin"], { cwd: baselineDir });
    } else {
      try {
        git(["remote", "set-url", "origin", BASELINE_REPO], { cwd: baselineDir });
      } catch {
        git(["remote", "add", "origin", BASELINE_REPO], { cwd: baselineDir });
      }
    }

    // Sparse-check out only the directories we mirror, plus the repo's
    // top-level metadata so the working tree is recognizable.
    const sparseFile = resolve(baselineDir, ".git", "info", "sparse-checkout");
    mkdirSync(dirname(sparseFile), { recursive: true });
    writeFileSync(
      sparseFile,
      ["/*", ...BASELINE_MIRROR_DIRS.map((d) => `/${d}/`)].join("\n") + "\n",
    );

    console.log(`Fetching ${BASELINE_REPO}#${BASELINE_BRANCH}...`);
    git(["fetch", "--depth=1", "--filter=blob:none", "origin", BASELINE_BRANCH], {
      cwd: baselineDir,
    });

    if (force) {
      // Discard any prior mirrored content before re-checkout.
      git(["reset", "--hard", "FETCH_HEAD"], { cwd: baselineDir });
    } else {
      // Fast-forward (or initial checkout) to the fetched tip while preserving
      // any tracked modifications introduced by a previous mirror step.
      try {
        gitQuiet(["rev-parse", "--verify", "HEAD"], { cwd: baselineDir });
        // Already on a commit; advance the index/work tree to FETCH_HEAD.
        git(["reset", "--hard", "FETCH_HEAD"], { cwd: baselineDir });
      } catch {
        git(["checkout", "--force", "FETCH_HEAD"], { cwd: baselineDir });
      }
    }

    console.log(`Baseline ready at ${baselineDir}`);
    return baselineDir;
  } catch (err) {
    console.warn(
      `WARN: failed to sync baseline from ${BASELINE_REPO}#${BASELINE_BRANCH}: ${err.message}`,
    );
    console.warn(
      "      Continuing without baseline mirror; set TYPESPEC_GO_SKIP_BASELINE=1 to silence.",
    );
    return null;
  }
}

/**
 * Mirrors locally regenerated test artifacts under packages/typespec-go/test/
 * into the baseline checkout. After this completes, running `git status` /
 * `git diff` inside temp/baseline shows the delta between the locally
 * regenerated output and the merged baseline.
 */
export function mirrorIntoBaseline(baselineRoot = baselineDir) {
  if (isBaselineDisabled()) {
    return;
  }
  if (!baselineRoot || !existsSync(resolve(baselineRoot, ".git"))) {
    return;
  }

  for (const rel of BASELINE_MIRROR_DIRS) {
    const src = resolve(pkgRoot, rel);
    const dest = resolve(baselineRoot, rel);

    // Wipe the destination so deletions in the local tree show up as
    // deletions inside the baseline checkout.
    if (existsSync(dest)) {
      rmSync(dest, { recursive: true, force: true });
    }

    if (!existsSync(src)) {
      continue;
    }
    if (!statSync(src).isDirectory()) {
      continue;
    }
    if (readdirSync(src).length === 0) {
      mkdirSync(dest, { recursive: true });
      continue;
    }

    mkdirSync(dirname(dest), { recursive: true });
    cpSync(src, dest, { recursive: true });
  }

  console.log(`Mirrored generated artifacts into ${baselineRoot}`);
  console.log(`Inspect deltas with:  git -C "${baselineRoot}" status`);
}

// Allow direct invocation: `node .scripts/sync-baseline.js [--force] [--mirror]`.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const root = syncBaseline({ force: args.includes("--force") });
  if (root && args.includes("--mirror")) {
    mirrorIntoBaseline(root);
  }
}
