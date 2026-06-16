// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.
//
// Runs `go test ./...` for every Go module (a directory containing a go.mod)
// under test/local/, test/http-specs/ and test/azure-http-specs/. Discovery is
// module-based (not test-file-based) so that directories holding hand-written
// tests for specs that are currently disabled in tspcompile.js -- and therefore
// have no generated code or go.mod -- are skipped instead of failing with
// "directory ... does not contain main module".
//
// Assumes the tsp-spector mock server is already running; use
// `pnpm spector --start`/`--stop` (see spector.js) to manage it.

import { spawnSync } from "child_process";
import { existsSync, readdirSync, statSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(scriptDir, "..");
const testRoots = ["test/local", "test/http-specs", "test/azure-http-specs"].map((d) =>
  resolve(pkgRoot, d),
);

// Finds module roots (directories containing a go.mod) under `root`. Does not
// descend into a module once found, so nested submodules are covered by their
// parent's `go test ./...` invocation.
function findModuleDirs(root) {
  const dirs = new Set();
  if (!existsSync(root)) return [];
  const walk = (dir) => {
    const entries = readdirSync(dir);
    if (entries.some((e) => e === "go.mod" && !statSync(resolve(dir, e)).isDirectory())) {
      dirs.add(dir);
      return;
    }
    for (const entry of entries) {
      const p = resolve(dir, entry);
      if (statSync(p).isDirectory()) walk(p);
    }
  };
  walk(root);
  return [...dirs].sort();
}

const dirs = testRoots.flatMap((root) => findModuleDirs(root));
console.log(`Discovered ${dirs.length} go test modules under ${testRoots.join(", ")}`);

let failed = false;
for (const dir of dirs) {
  console.log(`\n=== go test ./... in ${dir} ===`);
  const result = spawnSync("go", ["test", "-run", "^Test", "-v", "./..."], {
    cwd: dir,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    console.error(`go test failed in ${dir}`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}
