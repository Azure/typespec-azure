import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

it("archives runtime build assets without checkout metadata, SDK output, or virtual environments", async () => {
  const root = await mkdtemp(join(tmpdir(), "benchmark-archive-test-"));
  const assets = [
    "node_modules/dependency/index.js",
    "packages/benchmark/dist/src/cli.js",
    "core/packages/compiler/dist/src/index.js",
    "packages/typespec-autorest/schema/dist/schema.js",
    "packages/typespec-autorest/schema/dist/ServiceYaml.json",
    "packages/typespec-java/generator/http-client-generator/target/emitter.jar",
    "packages/benchmark/.emitters/node_modules/emitter/index.js",
    "packages/benchmark/.external/spec/main.tsp",
  ];
  const excluded = [
    "packages/benchmark/.external/spec/.git/config",
    "packages/benchmark/.external/spec/tsp-output/generated.ts",
    "node_modules/dependency/venv/bin/python",
  ];
  try {
    for (const file of [...assets, ...excluded]) {
      const path = join(root, file);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, "fixture");
    }
    const archive = join(root, "build.tar.gz");
    execFileSync(
      process.execPath,
      [fileURLToPath(new URL("../scripts/archive-build.ts", import.meta.url)), archive],
      { cwd: root },
    );
    const paths = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).split(/\r?\n/);
    for (const file of assets) expect(paths).toContain(file);
    for (const file of excluded) expect(paths).not.toContain(file);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
