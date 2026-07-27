import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CompileScenario, CompileScenarioResult } from "../src/index.js";
import { compileScenarios, resolveSpecEntrypoint } from "../src/index.js";

/** Package root — has `node_modules/.bin/tsp`, so subprocesses can find the CLI. */
const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "spector-compiler-"));
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

describe("resolveSpecEntrypoint", () => {
  it("returns the key directly when it ends in .tsp", () => {
    expect(resolveSpecEntrypoint("/specs", "resiliency/old.tsp")).toBe("/specs/resiliency/old.tsp");
  });

  it("prefers client.tsp over main.tsp when present", () => {
    writeSpec("withClient", "client.tsp", "");
    writeSpec("withClient", "main.tsp", "");
    expect(resolveSpecEntrypoint(root, "withClient")).toBe(join(root, "withClient", "client.tsp"));
  });

  it("falls back to main.tsp when no client.tsp exists", () => {
    writeSpec("onlyMain", "main.tsp", "");
    expect(resolveSpecEntrypoint(root, "onlyMain")).toBe(join(root, "onlyMain", "main.tsp"));
  });
});

describe("compileScenarios", () => {
  function scenario(name: string, entrypoint: string): CompileScenario {
    return { name, entrypoint, emit: [] };
  }

  it("compiles a valid spec successfully with no emitters", async () => {
    const entry = writeSpec("valid", "main.tsp", "namespace Valid;\n");
    const summary = await compileScenarios([scenario("valid", entry)], {
      verbose: false,
      cwd: pkgRoot,
    });
    expect(summary.succeeded).toBe(1);
    expect(summary.failed).toBe(0);
    expect(summary.results[0].success).toBe(true);
  });

  it("reports a spec with an error diagnostic as failed", async () => {
    const entry = writeSpec("invalid", "main.tsp", "model Foo { x: NotAType }\n");
    const summary = await compileScenarios([scenario("invalid", entry)], {
      verbose: false,
      cwd: pkgRoot,
    });
    expect(summary.failed).toBe(1);
    expect(summary.results[0].success).toBe(false);
    expect(summary.results[0].output).toContain("NotAType");
  });

  it("reports a missing entrypoint as a failure", async () => {
    const missing = join(root, "does-not-exist", "main.tsp");
    const summary = await compileScenarios([scenario("missing", missing)], {
      verbose: false,
      cwd: pkgRoot,
    });
    expect(summary.failed).toBe(1);
    expect(summary.results[0].success).toBe(false);
  });

  it("aggregates a mix of successes and failures across many scenarios", async () => {
    const scenarios: CompileScenario[] = [];
    for (let i = 0; i < 6; i++) {
      const ok = i % 2 === 0;
      const entry = writeSpec(
        `mix${i}`,
        "main.tsp",
        ok ? `namespace Mix${i};\n` : "model Bad { x: Missing }\n",
      );
      scenarios.push(scenario(`mix${i}`, entry));
    }
    const summary = await compileScenarios(scenarios, { verbose: false, jobs: 3, cwd: pkgRoot });
    expect(summary.results).toHaveLength(6);
    expect(summary.succeeded).toBe(3);
    expect(summary.failed).toBe(3);
  });

  it("invokes onScenarioComplete once per scenario", async () => {
    const scenarios: CompileScenario[] = [0, 1, 2].map((i) => {
      const entry = writeSpec(`hook${i}`, "main.tsp", `namespace Hook${i};\n`);
      return scenario(`hook${i}`, entry);
    });
    const seen: string[] = [];
    await compileScenarios(scenarios, {
      verbose: false,
      jobs: 2,
      cwd: pkgRoot,
      onScenarioComplete: (r: CompileScenarioResult) => {
        seen.push(r.scenario.name);
      },
    });
    expect(seen.sort()).toEqual(["hook0", "hook1", "hook2"]);
  });

  it("runs each scenario in its own cwd when scenario.cwd is set", async () => {
    // A tspconfig.yaml that only exists in the scenario's cwd, referenced
    // relatively. It compiles only if the subprocess runs in that cwd.
    const specEntry = writeSpec("cwdcase", "main.tsp", "namespace CwdCase;\n");
    writeSpec("cwdcase", "tspconfig.yaml", "options: {}\n");
    const scenarioCwd = join(root, "cwdcase");
    const summary = await compileScenarios(
      [
        {
          name: "cwdcase",
          entrypoint: specEntry,
          emit: [],
          cwd: scenarioCwd,
          args: ["--config", "tspconfig.yaml"],
        },
      ],
      { verbose: false, cwd: pkgRoot },
    );
    expect(summary.succeeded).toBe(1);
    expect(summary.results[0].success).toBe(true);
  });

  it("respects the concurrency limit", async () => {
    let active = 0;
    let maxActive = 0;
    const scenarios: CompileScenario[] = [];
    for (let i = 0; i < 8; i++) {
      const entry = writeSpec(`conc${i}`, "main.tsp", `namespace Conc${i};\n`);
      scenarios.push(scenario(`conc${i}`, entry));
    }
    await compileScenarios(scenarios, {
      verbose: false,
      jobs: 3,
      cwd: pkgRoot,
      onScenarioComplete: async () => {
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active--;
      },
    });
    expect(maxActive).toBeLessThanOrEqual(3);
  });
});
