import { getSuppressions, getUnversionedSuppressions } from "@azure-tools/typespec-azure-core";
import { resolveVirtualPath } from "@typespec/compiler/testing";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { compileService } from "../src/cli/compile.js";
import { Tester, TesterWithSuppressions } from "./test-host.js";

describe("CLI compilation", () => {
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

  it("compiles specs without importing the removed breaking-change library", async () => {
    const { fs } = await Tester.compile("");
    fs.add("main.tsp", "model Widget {}");

    const program = await compileService(resolveVirtualPath("main.tsp"), {
      host: fs.compilerHost,
    });

    expect(program.diagnostics).toEqual([]);
    expect(program.getGlobalNamespaceType().models.has("Widget")).toBe(true);
  });

  it("loads approval metadata from an explicit Azure.Core import", async () => {
    const { fs } = await TesterWithSuppressions.compile("");
    fs.add(
      "main.tsp",
      `
        import "@azure-tools/typespec-azure-core";
        @Azure.Core.approvedBreakingChange("Versioned.", #{ kind: "OperationRemoved", since: "2025-01-01" })
        @Azure.Core.approvedUnversionedChange("Migration.", #{ kind: "OperationRemoved" })
        model Widget {}
      `,
    );

    const program = await compileService(resolveVirtualPath("main.tsp"), {
      host: fs.compilerHost,
    });

    expect(program.diagnostics).toEqual([]);
    const widget = program.getGlobalNamespaceType().models.get("Widget")!;
    expect(getSuppressions(program, widget)).toEqual([
      { kind: "OperationRemoved", reason: "Versioned.", version: "2025-01-01" },
    ]);
    expect(getUnversionedSuppressions(program, widget)).toEqual([
      { kind: "OperationRemoved", reason: "Migration." },
    ]);
  });

  it("returns compilation diagnostics instead of hiding invalid specifications", async () => {
    const { fs } = await Tester.compile("");
    fs.add("main.tsp", "model Widget { value: MissingType; }");

    const program = await compileService(resolveVirtualPath("main.tsp"), {
      host: fs.compilerHost,
    });

    expect(program.diagnostics).toHaveLength(1);
    expect(program.diagnostics[0]).toMatchObject({
      code: "invalid-ref",
      severity: "error",
    });
  });
});
