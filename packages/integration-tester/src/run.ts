import pc from "picocolors";
import type { IntegrationTestSuite } from "./config/types.js";
import { findPackages, printPackages } from "./find-packages.js";
import { ensureRepoState } from "./git.js";
import { patchPackageJson } from "./patch-package-json.js";
import { action, execWithSpinner, log, repoRoot } from "./utils.js";
import { validateSpecs } from "./validate.js";

export interface RunIntegrationTestSuiteOptions {
  clean?: boolean;
}
export async function runIntegrationTestSuite(
  wd: string,
  suiteName: string,
  config: IntegrationTestSuite,
  options: RunIntegrationTestSuiteOptions = {},
): Promise<void> {
  log("Running", pc.cyan(suiteName), config);
  await ensureRepoState(config, wd, {
    clean: options.clean,
  });

  const packages = await action("Resolving local package versions", async () => {
    const packages = await findPackages({ wsDir: repoRoot });
    printPackages(packages);
    return packages;
  });

  await action("Patching package.json", async () => {
    await patchPackageJson(wd, packages);
  });

  await action("Installing dependencies", async (spinner) => {
    await execWithSpinner(spinner, "npm", ["install", "--no-package-lock"], {
      cwd: wd,
    });
  });

  await validateSpecs(wd, config);
}
