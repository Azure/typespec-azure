// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

import { readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { assert, it } from "vitest";
import { listScenarioNames } from "./gen-scenario-suites.mjs";

// Fails when the generated per-scenario suite files drift from the `.md` set,
// prompting a `pnpm gen:scenario-suites` run. Keeping one test file per scenario
// is what makes each scenario show up as its own group in the test report.
it("scenario suite files are up to date with the .md scenarios", () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const suitesDir = path.join(here, "scenario-suites");

  const expected = listScenarioNames()
    .map((name) => `${name}.test.ts`)
    .sort();
  const actual = readdirSync(suitesDir)
    .filter((f) => f.endsWith(".test.ts"))
    .sort();

  assert.deepStrictEqual(
    actual,
    expected,
    "Scenario suite files are out of date. Run `pnpm gen:scenario-suites`.",
  );
});
