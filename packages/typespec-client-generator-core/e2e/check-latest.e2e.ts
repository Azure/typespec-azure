/* eslint-disable no-console */

import { findTestPackageRoot } from "@typespec/compiler/testing";
import { SpawnOptions, spawn } from "child_process";
import { cp, readdir, rm } from "fs/promises";
import { join, resolve } from "path";
import { beforeAll, it } from "vitest";

const packageRoot = await findTestPackageRoot(import.meta.url);
const tempDir = join(packageRoot, "temp/e2e");

let tgzFile: string;
beforeAll(async () => {
  await rm(tempDir, { recursive: true, force: true });

  await execAsync("pnpm", ["pack", "--pack-destination", tempDir]);
  const files = await readdir(tempDir);

  const filename = files.find((x) => x.startsWith("azure-tools-typespec-client-generator-core-"));
  if (filename === undefined) {
    throw new Error(
      `Cannot resolve package starting with "azure-tools-typespec-client-generator-core-"`
    );
  }
  tgzFile = join(tempDir, filename);
});

// Make sure it works with the latest version of dependencies and not just the local build.
it("works with latest version of packages", async () => {
  const dir = await setupScenario("basic-latest");
  await execAsync("npm", ["install", tgzFile], { cwd: dir });
  await execAsync("npx", ["tsp", "compile", ".", tgzFile], { cwd: dir });
});

async function setupScenario(name: string): Promise<string> {
  const target = resolve(tempDir, name);
  await cp(resolve(packageRoot, "e2e", name), target, {
    recursive: true,
  });
  return target;
}

async function execAsync(
  command: string,
  args: string[] = [],
  options: SpawnOptions = {}
): Promise<{ exitCode: number; stdio: string; stdout: string; stderr: string; proc: any }> {
  const child = spawn(command, args, options);

  return new Promise((resolve, reject) => {
    child.on("error", (error) => {
      reject(error);
    });
    const stdio: Buffer[] = [];
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout?.on("data", (data) => {
      stdout.push(data);
      stdio.push(data);
    });
    child.stderr?.on("data", (data) => {
      stderr.push(data);
      stdio.push(data);
    });

    child.on("exit", (exitCode) => {
      resolve({
        exitCode: exitCode ?? -1,
        stdio: Buffer.concat(stdio).toString(),
        stdout: Buffer.concat(stdout).toString(),
        stderr: Buffer.concat(stderr).toString(),
        proc: child,
      });
    });
  });
}
