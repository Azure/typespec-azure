// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

// Regenerates the expected output blocks in the emitter unit-test scenarios
// (test/unittest/scenarios/*.md) by running vitest with SCENARIOS_UPDATE=true.
// Any extra args are forwarded to vitest, so a single scenario can be updated,
// for example: `pnpm test:update test/unittest/scenario-suites/models-only.test.ts`.
import { execSync } from "child_process";

const extra = process.argv.slice(2).join(" ");
const cmdLine = `npx vitest run --pass-with-no-tests ${extra}`.trim();
console.log(cmdLine);
execSync(cmdLine, {
  stdio: "inherit",
  env: { ...process.env, SCENARIOS_UPDATE: "true" },
});
