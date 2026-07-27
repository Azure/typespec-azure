import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CompileScenario } from "../src/index.js";
import { runScenarioHook, runScenarioHooks } from "../src/index.js";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "spector-hooks-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function scenario(name: string): CompileScenario {
  const cwd = join(root, name);
  mkdirSync(cwd, { recursive: true });
  return { name, specPath: `spec/${name}`, entrypoint: "/x/main.tsp", emit: [], cwd };
}

// Writes "<specPath>|<phase>" into SPECTOR_OUTPUT_DIR/marker.txt.
const writeMarker =
  "node -e \"require('fs').writeFileSync(process.env.SPECTOR_OUTPUT_DIR + '/marker.txt', " +
  "process.env.SPECTOR_SPEC_PATH + '|' + process.env.SPECTOR_PHASE)\"";

describe("runScenarioHook", () => {
  it("runs the command with the scenario env and returns true on success", async () => {
    const s = scenario("a");
    const ok = await runScenarioHook(writeMarker, s, { cwd: root, phase: "compile" });
    expect(ok).toBe(true);
    expect(readFileSync(join(s.cwd!, "marker.txt"), "utf8")).toBe("spec/a|compile");
  });

  it("returns false when the command exits non-zero", async () => {
    const ok = await runScenarioHook('node -e "process.exit(1)"', scenario("b"), {
      cwd: root,
      phase: "compile",
    });
    expect(ok).toBe(false);
  });
});

describe("runScenarioHooks", () => {
  it("runs the command once per scenario and aggregates results", async () => {
    const scenarios = [scenario("one"), scenario("two")];
    const summary = await runScenarioHooks(writeMarker, scenarios, {
      cwd: root,
      phase: "declarations",
      jobs: 2,
    });
    expect(summary).toEqual({ succeeded: 2, failed: 0 });
    for (const s of scenarios) {
      expect(readFileSync(join(s.cwd!, "marker.txt"), "utf8")).toBe(`spec/${s.name}|declarations`);
    }
  });

  it("counts failures without rejecting", async () => {
    const summary = await runScenarioHooks('node -e "process.exit(1)"', [scenario("x")], {
      cwd: root,
      phase: "declarations",
    });
    expect(summary).toEqual({ succeeded: 0, failed: 1 });
  });
});
