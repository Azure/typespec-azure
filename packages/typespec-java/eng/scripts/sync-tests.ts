/* eslint-disable no-console */
import { execa } from "execa";
import { cp, rm } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getCoreSourceRoot, removeCoreSourceRoot } from "./core-commit.ts";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const repoRoot = resolve(packageRoot, "../..");
const coreRoot = join(repoRoot, "core");
const emitterTestsRoot = join(packageRoot, "emitter-tests");

const core = await getCoreSourceRoot(coreRoot, packageRoot);
try {
  const testRoot = join(core.root, "generator", "http-client-generator-test");
  const localSource = join(emitterTestsRoot, "src");
  const localTypeSpec = join(emitterTestsRoot, "tsp");

  await Promise.all([
    rm(localSource, { recursive: true, force: true }),
    rm(localTypeSpec, { recursive: true, force: true }),
  ]);
  await cp(join(testRoot, "src"), localSource, { recursive: true, force: true });
  await cp(join(testRoot, "tsp"), localTypeSpec, { recursive: true, force: true });
  console.log(`Synced src and tsp from ${testRoot}`);

  const relativeEmitterTests = relative(repoRoot, emitterTestsRoot).replaceAll("\\", "/");
  await execa(
    "git",
    [
      "-C",
      repoRoot,
      "apply",
      `--directory=${relativeEmitterTests}`,
      "-p1",
      join(packageRoot, "core.test.patch"),
      "--ignore-whitespace",
    ],
    { stdio: "inherit" },
  );
  console.log("Applied core.test.patch");
} finally {
  await removeCoreSourceRoot(core);
}
