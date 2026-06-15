// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.
//
// Runs golangci-lint and shadow against every Go module under test/local/.
// Expects golangci-lint and `shadow` to be available on PATH (installed by CI).

import { spawnSync } from "child_process";
import { existsSync, readdirSync, statSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(scriptDir, "..");
const testLocal = resolve(pkgRoot, "test", "local");

function findModuleDirs(root) {
  const dirs = new Set();
  if (!existsSync(root)) return [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const p = resolve(dir, entry);
      if (entry === "go.mod" && !statSync(p).isDirectory()) {
        dirs.add(dir);
        return;
      }
    }
    for (const entry of readdirSync(dir)) {
      const p = resolve(dir, entry);
      if (statSync(p).isDirectory()) walk(p);
    }
  };
  walk(root);
  return [...dirs].sort();
}

const dirs = findModuleDirs(testLocal);
console.log(`Linting ${dirs.length} go modules under ${testLocal}`);

let failed = false;
for (const dir of dirs) {
  console.log(`\n=== golangci-lint in ${dir} ===`);
  let result = spawnSync("golangci-lint", ["run", "./..."], { cwd: dir, stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`golangci-lint failed in ${dir}`);
    failed = true;
  }
  console.log(`=== shadow in ${dir} ===`);
  result = spawnSync("shadow", ["./..."], { cwd: dir, stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`shadow failed in ${dir}`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}
