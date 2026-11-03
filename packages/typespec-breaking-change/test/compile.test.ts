import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { compileService } from "../src/cli/compile.js";

describe("compileService", () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })),
    );
  });

  it("compiles without injecting a nonexistent package library", async () => {
    const directory = await mkdtemp(join(tmpdir(), "typespec-breaking-change-compile-"));
    temporaryDirectories.push(directory);
    const main = join(directory, "main.tsp");
    await writeFile(main, "model Widget { name: string; }\n");

    const program = await compileService(main);

    expect(program.diagnostics.filter((diagnostic) => diagnostic.severity === "error")).toEqual([]);
  });
});
