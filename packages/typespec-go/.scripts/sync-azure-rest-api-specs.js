// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.
//
// Syncs the subset of Azure/azure-rest-api-specs needed by tspcompile.js
// into ./temp/azure-rest-api-specs at a pinned commit. Uses a sparse,
// blobless, shallow clone so that only the listed spec folders are
// downloaded. Safe to re-run: skips work when the cache is already at
// the pinned commit.

import { execFileSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(scriptDir, "..");
const cacheDir = resolve(pkgRoot, "temp", "azure-rest-api-specs");
const markerFile = resolve(cacheDir, ".commit");

const config = JSON.parse(readFileSync(resolve(scriptDir, "azure-rest-api-specs.json"), "utf8"));

export const azureRestApiSpecsRoot = cacheDir;
export const azureRestApiSpecsCommit = config.commit;

function git(args, opts = {}) {
  return execFileSync("git", args, { stdio: "inherit", ...opts });
}

export function syncAzureRestApiSpecs({ force = false } = {}) {
  if (!force && existsSync(markerFile)) {
    const current = readFileSync(markerFile, "utf8").trim();
    if (current === config.commit) {
      return cacheDir;
    }
  }

  console.log(`Syncing azure-rest-api-specs to ${config.commit}...`);
  mkdirSync(cacheDir, { recursive: true });

  if (!existsSync(resolve(cacheDir, ".git"))) {
    git(["init", "--quiet"], { cwd: cacheDir });
    git(["remote", "add", "origin", config.repository], { cwd: cacheDir });
    git(["config", "core.sparseCheckout", "true"], { cwd: cacheDir });
    git(["config", "extensions.partialClone", "origin"], { cwd: cacheDir });
  } else {
    // Ensure the remote URL matches (in case of repo migration / fork override).
    try {
      git(["remote", "set-url", "origin", config.repository], { cwd: cacheDir });
    } catch {
      git(["remote", "add", "origin", config.repository], { cwd: cacheDir });
    }
  }

  // Refresh the sparse-checkout list in case paths were added / removed.
  const sparseFile = resolve(cacheDir, ".git", "info", "sparse-checkout");
  mkdirSync(dirname(sparseFile), { recursive: true });
  writeFileSync(sparseFile, config.sparseCheckoutPaths.join("\n") + "\n");

  // Fetch the pinned commit with no blob history. GitHub allows fetching
  // arbitrary SHAs via uploadpack.allowReachableSHA1InWant.
  git(["fetch", "--depth=1", "--filter=blob:none", "origin", config.commit], { cwd: cacheDir });
  git(["checkout", "--force", config.commit], { cwd: cacheDir });

  writeFileSync(markerFile, config.commit + "\n");
  console.log(`azure-rest-api-specs cache ready at ${cacheDir}`);
  return cacheDir;
}

// Allow direct invocation: `node .scripts/sync-azure-rest-api-specs.js [--force]`.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  syncAzureRestApiSpecs({ force: process.argv.includes("--force") });
}
