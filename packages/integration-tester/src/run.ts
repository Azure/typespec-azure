import { mkdir, rm } from "fs/promises";
import pc from "picocolors";
import type { IntegrationTestSuite } from "./config/types.js";
import { patchPackageJson } from "./patch-package-json.js";
import { action, execWithSpinner, log } from "./utils.js";

export async function runIntegrationTestSuite(
  wd: string,
  suiteName: string,
  config: IntegrationTestSuite,
): Promise<void> {
  log("Running", pc.cyan(suiteName), config);
  await action("Preparing workspace", async () => {
    await rm(wd, { recursive: true, force: true });
    await mkdir(wd, { recursive: true });
  });
  await cloneRepo(config, wd);

  await action("Patching package.json", async () => {
    await patchPackageJson(wd);
  });
}

export async function cloneRepo(
  { repo, branch }: IntegrationTestSuite,
  dir: string,
): Promise<void> {
  await action(`Cloning repo ${pc.cyan(repo)} (branch: ${pc.cyan(branch)})`, async (spinner) => {
    await execWithSpinner(spinner, "git", ["clone", "-b", branch, "--depth", "1", repo, dir]);
  });
}
