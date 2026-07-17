// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

// Regenerates the expected output blocks in the emitter unit-test scenarios
// (test/unittest/scenarios/*.md) by running vitest with SCENARIOS_UPDATE=true.
//
// A brand-new scenario `.md` only runs once it has a matching generated suite
// under test/unittest/scenario-suites/, so we regenerate the suites first — that
// way `pnpm test:update` picks up a newly added `.md` without a separate
// `pnpm gen:scenario-suites` step.
//
// Any extra args are forwarded to vitest, so a single scenario can be updated,
// for example: `pnpm test:update test/unittest/scenario-suites/models-only.test.ts`.
import { execSync } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const genSuites = resolve(scriptDir, "..", "test", "unittest", "gen-scenario-suites.mjs");

// Ensure every scenario .md has an up-to-date suite before running vitest.
execSync(`node "${genSuites}"`, { stdio: "inherit" });

const extra = process.argv.slice(2).join(" ");
const cmdLine = `npx vitest run --pass-with-no-tests ${extra}`.trim();
console.log(cmdLine);
execSync(cmdLine, {
  stdio: "inherit",
  env: { ...process.env, SCENARIOS_UPDATE: "true" },
});
