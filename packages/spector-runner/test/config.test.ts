import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CompileScenario } from "../src/index.js";
import { defineConfig, loadConfigFile, runConfig } from "../src/index.js";

/** Package root — has `node_modules/.bin/tsp`, so subprocesses can find the CLI. */
const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "spector-config-"));
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

function writeSpec(dir: string, file: string, content: string): string {
  const full = join(root, dir);
  mkdirSync(full, { recursive: true });
  const path = join(full, file);
  writeFileSync(path, content);
  return path;
}

function scenario(name: string): CompileScenario {
  const entry = writeSpec(name, "main.tsp", `namespace ${name.replace(/[^A-Za-z0-9]/g, "")};\n`);
  return { name, entrypoint: entry, emit: [] };
}

describe("defineConfig", () => {
  it("returns the config unchanged", () => {
    const scenarios: CompileScenario[] = [];
    const config = defineConfig({ scenarios });
    expect(config.scenarios).toBe(scenarios);
  });
});

describe("runConfig", () => {
  it("invokes preRun, postScenario per scenario, then postRun in order", async () => {
    const events: string[] = [];
    await runConfig({
      cwd: pkgRoot,
      scenarios: [scenario("alpha"), scenario("beta")],
      preRun: () => {
        events.push("pre");
      },
      postScenario: (result) => {
        events.push(`post:${result.scenario.name}`);
      },
      postRun: (summary) => {
        events.push(`done:${summary.succeeded}`);
      },
    });

    expect(events[0]).toBe("pre");
    expect(events[events.length - 1]).toBe("done:2");
    expect(events.filter((e) => e.startsWith("post:")).sort()).toEqual(["post:alpha", "post:beta"]);
  });

  it("supports an async scenario builder that receives the run context", async () => {
    let seenJobs = 0;
    const summary = await runConfig(
      {
        cwd: pkgRoot,
        jobs: 5,
        scenarios: async (ctx) => {
          seenJobs = ctx.jobs;
          return [scenario("built")];
        },
      },
      { jobs: 2 },
    );
    // CLI override wins over the config's own jobs value.
    expect(seenJobs).toBe(2);
    expect(summary.succeeded).toBe(1);
  });

  it("filters scenarios by name and exposes the filter to hooks", async () => {
    const seen: string[] = [];
    let filterInPreRun: string | undefined;
    const summary = await runConfig(
      {
        cwd: pkgRoot,
        scenarios: [scenario("keep-me"), scenario("drop-me")],
        preRun: (ctx) => {
          filterInPreRun = ctx.filter;
        },
        postScenario: (result) => {
          seen.push(result.scenario.name);
        },
      },
      { filter: "keep" },
    );

    expect(filterInPreRun).toBe("keep");
    expect(seen).toEqual(["keep-me"]);
    expect(summary.results).toHaveLength(1);
  });
});

describe("loadConfigFile", () => {
  it("loads a default-exported config module", async () => {
    const modPath = join(root, "runner.config.mjs");
    writeFileSync(
      modPath,
      `export default { scenarios: [{ name: "x", entrypoint: "/x/main.tsp", emit: [] }] };\n`,
    );
    const config = await loadConfigFile(modPath);
    expect(Array.isArray(config.scenarios)).toBe(true);
  });

  it("rejects a module without a scenarios property", async () => {
    const modPath = join(root, "bad.config.mjs");
    writeFileSync(modPath, `export default { nope: true };\n`);
    await expect(loadConfigFile(modPath)).rejects.toThrow(/must default-export/);
  });
});
