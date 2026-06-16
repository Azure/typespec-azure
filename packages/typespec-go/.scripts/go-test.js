// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.
//
// Runs `go test ./...` under every directory below test/local/,
// test/http-specs/ and test/azure-http-specs/ that contains `_test.go` files.
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

function findTestDirs(root) {
  const dirs = new Set();
  if (!existsSync(root)) return [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const p = resolve(dir, entry);
      if (statSync(p).isDirectory()) walk(p);
      else if (entry.endsWith("_test.go")) dirs.add(dir);
    }
  };
  walk(root);
  return [...dirs].sort();
}

const dirs = testRoots.flatMap((root) => findTestDirs(root));
console.log(`Discovered ${dirs.length} go test directories under ${testRoots.join(", ")}`);

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
