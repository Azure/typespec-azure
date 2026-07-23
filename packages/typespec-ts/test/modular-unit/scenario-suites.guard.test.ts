import { readdirSync } from "fs";
import path from "path";
import { assert, it } from "vitest";
import { getLeafScenarioDirs, PACKAGE_ROOT } from "./scenario-runner.js";

const SUITES_DIR = path.resolve(PACKAGE_ROOT, "test", "modular-unit", "scenario-suites");

function suiteFileName(relDir: string): string {
  return relDir.split(/[\\/]/).join("__") + ".test.ts";
}

/**
 * Guards against silent coverage loss: every leaf scenario directory must have
 * exactly one generated suite file, and vice versa. If this fails after adding
 * or moving scenarios, run `pnpm gen:scenario-suites`.
 */
it("every scenario leaf directory has a generated suite file", () => {
  const expected = getLeafScenarioDirs().map(suiteFileName).sort();
  const actual = readdirSync(SUITES_DIR)
    .filter((f) => f.endsWith(".test.ts"))
    .sort();

  assert.deepEqual(
    actual,
    expected,
    "Scenario suite files are out of sync with the scenario directory tree. Run `pnpm gen:scenario-suites` to regenerate them.",
  );
});
