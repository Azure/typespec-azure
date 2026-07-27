import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildScenarios, formatOutputDir } from "../src/index.js";

describe("formatOutputDir", () => {
  it("substitutes {path}, {dir} and {parentDir}", () => {
    expect(
      formatOutputDir("out/{parentDir}/{options.module}", "encode/datetime", { module: "dt" }),
    ).toBe("out/encode/dt");
    expect(formatOutputDir("{dir}", "encode/datetime", {})).toBe("encode/datetime");
    expect(formatOutputDir("{path}", "encode/datetime", {})).toBe("encode/datetime");
  });

  it("strips a trailing .tsp file from {dir}/{parentDir}", () => {
    expect(formatOutputDir("{dir}", "a/b/client.tsp", {})).toBe("a/b");
    expect(formatOutputDir("{parentDir}", "a/b/client.tsp", {})).toBe("a");
  });

  it("yields an empty {parentDir} for a top-level spec", () => {
    expect(
      formatOutputDir("root/{parentDir}/{options.module}", "special-words", { module: "sw" }),
    ).toBe("root//sw");
  });

  it("throws when an {options.NAME} placeholder has no matching option", () => {
    expect(() => formatOutputDir("{options.module}", "a/b", {})).toThrow(/missing option 'module'/);
  });

  it("resolves {outputPath} to the outputPath option, defaulting to the spec key", () => {
    expect(formatOutputDir("out/{outputPath}", "a/b", {})).toBe("out/a/b");
    expect(formatOutputDir("out/{outputPath}", "a/b", { outputPath: "a/b/v2" })).toBe("out/a/b/v2");
  });
});

describe("buildScenarios", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "spector-run-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  function writeConfig(name: string, body: string): string {
    const path = join(root, name);
    writeFileSync(path, body);
    return path;
  }

  function specsRoot(): string {
    // The entrypoint files don't need to exist for buildScenarios; it only
    // resolves paths (client.tsp is preferred only when present on disk).
    return join(root, "specs");
  }

  it("maps config specs to scenarios with merged options and output dirs", () => {
    const config = writeConfig(
      "spector.config.yaml",
      [
        "specs:",
        '  "encode/datetime": { options: { module: dt, slice-elements-byval: true } }',
        '  "special-words": { options: { module: sw } }',
      ].join("\n"),
    );
    const scenarios = buildScenarios({
      config,
      specsRoot: specsRoot(),
      emit: ["@azure-tools/typespec-go"],
      options: { "generate-fakes": true, "file-prefix": "zz_" },
      outputDir: "out/{parentDir}/{options.module}",
      cwd: root,
    });

    expect(scenarios.map((s) => s.name).sort()).toEqual(["dt", "sw"]);
    const dt = scenarios.find((s) => s.name === "dt")!;
    expect(dt.entrypoint).toBe(join(specsRoot(), "encode/datetime", "main.tsp"));
    const opts = dt.options!["@azure-tools/typespec-go"];
    // default + per-spec merge, per-spec wins on conflict
    expect(opts["generate-fakes"]).toBe(true);
    expect(opts["slice-elements-byval"]).toBe(true);
    expect(opts.module).toBe("dt");
    expect(opts["emitter-output-dir"]).toBe(join(root, "out/encode/dt"));
  });

  it("lets per-spec options override defaults", () => {
    const config = writeConfig(
      "c.yaml",
      ["specs:", '  "a/b": { options: { module: m, "generate-fakes": false } }'].join("\n"),
    );
    const [scenario] = buildScenarios({
      config,
      specsRoot: specsRoot(),
      emit: ["e"],
      emitterName: "e",
      options: { "generate-fakes": true },
      cwd: root,
    });
    expect(scenario.options!.e["generate-fakes"]).toBe(false);
  });

  it("applies the filter against the scenario name (module)", () => {
    const config = writeConfig(
      "c.yaml",
      [
        "specs:",
        '  "a/one": { options: { module: keep } }',
        '  "a/two": { options: { module: drop } }',
      ].join("\n"),
    );
    const scenarios = buildScenarios({
      config,
      specsRoot: specsRoot(),
      emit: ["e"],
      emitterName: "e",
      filter: "keep",
      cwd: root,
    });
    expect(scenarios.map((s) => s.name)).toEqual(["keep"]);
  });

  it("derives the emitter name from a path emit's package.json", () => {
    const emitDir = join(root, "emitter");
    mkdirSync(emitDir, { recursive: true });
    writeFileSync(join(emitDir, "package.json"), JSON.stringify({ name: "@scope/my-emitter" }));
    const config = writeConfig(
      "c.yaml",
      ["specs:", '  "a/b": { options: { module: m } }'].join("\n"),
    );
    const [scenario] = buildScenarios({
      config,
      specsRoot: specsRoot(),
      emit: [emitDir],
      cwd: root,
    });
    expect(Object.keys(scenario.options!)).toEqual(["@scope/my-emitter"]);
  });

  it("appends extraScenarios", () => {
    const config = writeConfig(
      "c.yaml",
      ["specs:", '  "a/b": { options: { module: m } }'].join("\n"),
    );
    const scenarios = buildScenarios({
      config,
      specsRoot: specsRoot(),
      emit: ["e"],
      emitterName: "e",
      cwd: root,
      extraScenarios: [{ name: "extra", entrypoint: "/x/main.tsp", emit: ["e"] }],
    });
    expect(scenarios.map((s) => s.name)).toContain("extra");
  });

  it("in compileConfig mode compiles in each output dir with no synthesized emit/options", () => {
    const config = writeConfig(
      "c.yaml",
      [
        "specs:",
        "  a/b: true",
        '  "versioning/removed":',
        "    - { options: { outputPath: versioning/removed/v1 } }",
        "    - { options: { outputPath: versioning/removed/v2 } }",
      ].join("\n"),
    );
    const scenarios = buildScenarios({
      config,
      specsRoot: specsRoot(),
      emit: [],
      compileConfig: "tspconfig.yaml",
      outputDir: "gen/{outputPath}",
      cwd: root,
    });

    // name defaults to the spec key, or the outputPath option when set.
    expect(scenarios.map((s) => s.name).sort()).toEqual([
      "a/b",
      "versioning/removed/v1",
      "versioning/removed/v2",
    ]);
    const v2 = scenarios.find((s) => s.name === "versioning/removed/v2")!;
    expect(v2.cwd).toBe(join(root, "gen/versioning/removed/v2"));
    expect(v2.args).toEqual(["--config", "tspconfig.yaml"]);
    expect(v2.emit).toEqual([]);
    expect(v2.options).toBeUndefined();
    expect(v2.specPath).toBe("versioning/removed");
    // entrypoint resolves from the spec key, not the outputPath.
    expect(v2.entrypoint).toBe(join(specsRoot(), "versioning/removed", "main.tsp"));
  });

  it("throws in compileConfig mode when no outputDir template is given", () => {
    const config = writeConfig("c.yaml", ["specs:", "  a/b: true"].join("\n"));
    expect(() =>
      buildScenarios({
        config,
        specsRoot: specsRoot(),
        emit: [],
        compileConfig: "tspconfig.yaml",
        cwd: root,
      }),
    ).toThrow(/requires an outputDir/);
  });
});
