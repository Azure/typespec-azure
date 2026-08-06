/* eslint-disable no-console */
import { execa } from "execa";
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getCoreSourceRoot, removeCoreSourceRoot } from "./core-commit.ts";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const repoRoot = resolve(packageRoot, "../..");
const coreRoot = join(repoRoot, "core");

async function main() {
  const core = await getCoreSourceRoot(coreRoot, packageRoot);
  try {
    const emitterRoot = join(core.root, "emitter");
    await cp(join(emitterRoot, "src"), join(packageRoot, "src"), {
      recursive: true,
      force: true,
      filter: (source) => basename(source) !== "options.ts",
    });
    await cp(join(emitterRoot, "test"), join(packageRoot, "test"), {
      recursive: true,
      force: true,
    });

    const sourceGenerator = join(core.root, "generator");
    const destinationGenerator = join(packageRoot, "generator");
    const excludedModules = new Set([
      "http-client-generator-test",
      "http-client-generator-clientcore-test",
    ]);

    console.log("Copy generator sources from core");
    await rm(destinationGenerator, { recursive: true, force: true });
    await mkdir(destinationGenerator);
    for (const entry of await readdir(sourceGenerator, { withFileTypes: true })) {
      if (!excludedModules.has(entry.name)) {
        await cp(join(sourceGenerator, entry.name), join(destinationGenerator, entry.name), {
          recursive: true,
          force: true,
        });
      }
    }

    console.log("Apply Azure customization patch to copied generator");
    const relativeGenerator = relative(repoRoot, destinationGenerator).replaceAll("\\", "/");
    await execa(
      "git",
      [
        "-C",
        repoRoot,
        "apply",
        `--directory=${relativeGenerator}`,
        "-p1",
        join(packageRoot, "core.patch"),
        "--ignore-whitespace",
      ],
      { stdio: "inherit" },
    );
  } finally {
    await removeCoreSourceRoot(core);
  }
}

await main();
