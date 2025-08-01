import { execa } from "execa";
import type { IntegrationTestSuite } from "./config/types.js";

export async function runIntegrationTestSuite(
  wd: string,
  suiteName: string,
  config: IntegrationTestSuite,
): Promise<void> {
  await cloneRepo(config.repo, wd);
}

export function cloneRepo(repo: string, dir: string) {
  await execa("git", ["clone", repo, dir]);
}
