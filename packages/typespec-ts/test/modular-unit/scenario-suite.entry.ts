import { describe, inject } from "vitest";
import { describeScenarioDir, SCENARIOS_LOCATION } from "./scenario-runner.js";

// Shared entry for every scenario-suite project. `vitest.config.ts` creates one
// project per leaf scenario directory and injects which directory this run owns
// via `provide`, so the scenario `.md` files are spread across worker processes
// without committing a generated test file per directory.
declare module "vitest" {
  interface ProvidedContext {
    scenarioDir: string;
  }
}

const scenarioDir = inject("scenarioDir");

describe(`Scenarios: ${scenarioDir}`, function () {
  describeScenarioDir(`${SCENARIOS_LOCATION}/${scenarioDir}`);
});
