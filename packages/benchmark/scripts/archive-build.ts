/* eslint-disable no-console */
import { spawn } from "node:child_process";
import { createWriteStream, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";

const output = process.argv[2];
if (!output) throw new Error("Usage: node archive-build.ts <archive.tar.gz>");
const paths = [
  "node_modules",
  "core/node_modules",
  "packages/benchmark/.emitters",
  "packages/benchmark/.external",
  "packages/typespec-java/generator/http-client-generator/target",
];
for (const root of ["packages", "core/packages"]) {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    for (const dir of ["dist", "node_modules"]) paths.push(join(root, entry.name, dir));
  }
}

// All jobs check out the same revision at the same workspace path. Preserve package
// links and generated build assets, but never archive checkout credentials or SDK output.
const child = spawn(
  "tar",
  [
    "--exclude=.git",
    "--exclude=tsp-output",
    "--exclude=venv",
    "-cf",
    "-",
    ...paths.filter(existsSync),
  ],
  { stdio: ["ignore", "pipe", "inherit"] },
);
const exited = new Promise<void>((resolve, reject) => {
  child.on("error", reject);
  child.on("close", (code) =>
    code === 0 ? resolve() : reject(new Error(`tar exited with ${code}`)),
  );
});
try {
  await Promise.all([
    exited,
    pipeline(child.stdout, createGzip({ level: 1 }), createWriteStream(resolve(output))),
  ]);
} finally {
  if (child.exitCode === null) child.kill();
}
console.log(`Archived benchmark build to ${output}`);
