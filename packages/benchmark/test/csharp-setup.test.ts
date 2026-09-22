import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { inspectCSharpInstallation, linkCSharpEmitter } from "../src/csharp.js";

let root: string;
let benchmark: string;
let install: string;

async function makePackage(dir: string, pkg: object) {
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "package.json"), JSON.stringify({ main: "index.js", ...pkg }));
  await writeFile(join(dir, "index.js"), "export {};");
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "benchmark-csharp-test-"));
  benchmark = join(root, "packages/benchmark");
  install = join(benchmark, ".emitters");
  await makePackage(benchmark, { name: "benchmark" });
  const compiler = join(root, "core/packages/compiler");
  await makePackage(compiler, { name: "@typespec/compiler", version: "1.0.0" });
  await mkdir(join(benchmark, "node_modules/@typespec"), { recursive: true });
  await symlink(compiler, join(benchmark, "node_modules/@typespec/compiler"), "dir");
  await makePackage(join(install, "node_modules/@azure-typespec/http-client-csharp"), {
    name: "@azure-typespec/http-client-csharp",
    version: "1.0.0-alpha.1",
    exports: { ".": { import: "./index.js" } },
    dependencies: { "@typespec/http-client-csharp": "1.0.0-alpha.2" },
  });
  await makePackage(join(install, "node_modules/@typespec/http-client-csharp"), {
    name: "@typespec/http-client-csharp",
    version: "1.0.0-alpha.2",
    peerDependencies: { "@typespec/compiler": "^1.0.0" },
  });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

it("links the emitter idempotently and records both published versions", async () => {
  await linkCSharpEmitter(benchmark);
  await linkCSharpEmitter(benchmark);
  expect(inspectCSharpInstallation(benchmark)).toEqual({
    "@azure-typespec/http-client-csharp": "1.0.0-alpha.1",
    "@typespec/http-client-csharp": "1.0.0-alpha.2",
  });
});

it("rejects a published compiler shadowing the workspace compiler", async () => {
  await linkCSharpEmitter(benchmark);
  await makePackage(join(install, "node_modules/@typespec/compiler"), {
    name: "@typespec/compiler",
    version: "1.0.0",
  });
  expect(() => inspectCSharpInstallation(benchmark)).toThrow(/@typespec\/compiler.*workspace/);
});

it("reports missing workspace peers instead of installing published substitutes", async () => {
  await linkCSharpEmitter(benchmark);
  await rm(join(benchmark, "node_modules/@typespec/compiler"));
  expect(() => inspectCSharpInstallation(benchmark)).toThrow(/@typespec\/compiler/);
});

it("does not overwrite an existing unrelated installation", async () => {
  const dir = join(benchmark, "node_modules/@azure-typespec/http-client-csharp");
  await makePackage(dir, { name: "other", version: "1.0.0" });
  await expect(linkCSharpEmitter(benchmark)).rejects.toThrow(/already exists/);
  expect(JSON.parse(await readFile(join(dir, "package.json"), "utf8")).name).toBe("other");
});
