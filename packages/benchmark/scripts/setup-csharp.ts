/* eslint-disable no-console */
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { inspectCSharpInstallation, linkCSharpEmitter } from "../src/csharp.ts";

const benchmarkDir = fileURLToPath(new URL("../", import.meta.url));
const installDir = new URL("../.emitters/", import.meta.url);
await mkdir(installDir, { recursive: true });
await writeFile(
  new URL("package.json", installDir),
  JSON.stringify({ private: true, type: "module" }),
);

// Peers must come from the workspace. npm is confined to this disposable project.
execFileSync(
  process.platform === "win32" ? "npm.cmd" : "npm",
  [
    "install",
    "--prefix",
    fileURLToPath(installDir),
    "--no-save",
    "--package-lock=false",
    "--legacy-peer-deps",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "@azure-typespec/http-client-csharp@latest",
  ],
  { stdio: "inherit", shell: process.platform === "win32" },
);

await linkCSharpEmitter(benchmarkDir);
console.log("C# benchmark packages:", inspectCSharpInstallation(benchmarkDir));
