/* eslint-disable no-console */
/**
 * Build a side-by-side diff workspace comparing the locally generated Python
 * SDKs against the committed baseline in the azure-sdk-for-python repo.
 *
 * Steps:
 *   1. (Re)create `<repo-root>/.python-code-diff`, clearing any existing content.
 *   2. Sparse-checkout `eng/tools/azure-sdk-tools/emitter/generated` from the
 *      `typespec-python-generated-tests` branch of Azure/azure-sdk-for-python.
 *   3. Remove the checked-out `azure` and `unbranded` baselines.
 *   4. Copy this package's freshly generated `tests/generated/azure` and
 *      `tests/generated/unbranded` into their place.
 *   5. Open the diff folder in VS Code (or print its path if `code` is missing).
 *
 * Usage:
 *   tsx eng/scripts/show-diff.ts
 */
import { execSync } from "child_process";
import { cpSync, existsSync, rmSync } from "fs";
import { dirname, join } from "path";
import pc from "picocolors";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));
// eng/scripts/show-diff.ts -> package root is two levels up
const packageRoot = join(here, "..", "..");
// packageRoot == <repo-root>/packages/typespec-python, so the repo root is two
// levels up from packageRoot.
const repoRoot = join(packageRoot, "..", "..");

const REPO_URL = "https://github.com/Azure/azure-sdk-for-python.git";
const BRANCH = "typespec-python-generated-tests";
const SPARSE_PATH = "eng/tools/azure-sdk-tools/emitter/generated";

const diffDir = join(repoRoot, ".python-code-diff");
const generatedDir = join(diffDir, ...SPARSE_PATH.split("/"));

const flavors = ["azure", "unbranded"] as const;

function run(command: string, cwd: string): void {
  console.log(pc.gray(`$ ${command}`));
  execSync(command, { cwd, stdio: "inherit" });
}

// 1. (Re)create the diff folder, clearing any existing content.
if (existsSync(diffDir)) {
  console.log(pc.yellow(`Clearing existing ${diffDir}`));
  rmSync(diffDir, { recursive: true, force: true });
}

// 2. Sparse-checkout the baseline generated folder.
console.log(pc.cyan(`Cloning ${REPO_URL} (${BRANCH})...`));
run(
  `git clone --no-checkout --depth 1 --filter=blob:none --branch ${BRANCH} ${REPO_URL} "${diffDir}"`,
  repoRoot,
);
run("git sparse-checkout init --cone", diffDir);
run(`git sparse-checkout set ${SPARSE_PATH}`, diffDir);
run("git checkout", diffDir);

// 3. Remove the checked-out azure / unbranded baselines.
for (const flavor of flavors) {
  const target = join(generatedDir, flavor);
  if (existsSync(target)) {
    console.log(pc.yellow(`Removing baseline ${target}`));
    rmSync(target, { recursive: true, force: true });
  }
}

// 4. Copy locally generated azure / unbranded into place.
for (const flavor of flavors) {
  const source = join(packageRoot, "tests", "generated", flavor);
  const target = join(generatedDir, flavor);
  if (!existsSync(source)) {
    console.warn(pc.yellow(`Skipping ${flavor}: ${source} does not exist`));
    continue;
  }
  console.log(pc.cyan(`Copying ${source} -> ${target}`));
  cpSync(source, target, { recursive: true });
}

// 5. Open the diff folder in VS Code, or print its path on failure.
try {
  execSync(`code "${diffDir}"`, { stdio: "inherit" });
} catch {
  console.log(pc.green(`see code diff in ${diffDir}`));
}
