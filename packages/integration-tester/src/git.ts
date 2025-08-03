import { execa } from "execa";
import { mkdir, rm } from "fs/promises";
import type { Ora } from "ora";
import { relative } from "pathe";
import pc from "picocolors";
import type { IntegrationTestSuite } from "./config/types.js";
import { action, execWithSpinner, log } from "./utils.js";

/**
 * Options for ensuring repository state.
 */
export interface EnsureRepoStateOptions {
  /** If true, forces a clean clone instead of updating existing repository */
  clean?: boolean;
}
/**
 * Ensures the repository is in the correct state by either cloning or updating it.
 *
 * @param suite - Integration test suite configuration containing repo and branch info
 * @param dir - Target directory for the repository
 * @param options - Options controlling the operation behavior
 */
export async function ensureRepoState(
  { repo, branch }: IntegrationTestSuite,
  dir: string,
  options: EnsureRepoStateOptions = {},
): Promise<void> {
  await action(`Checkout repo ${pc.cyan(repo)} at branch ${pc.cyan(branch)}`, async (spinner) => {
    const shouldUpdate = options.clean ? false : await repoExists(dir);
    if (shouldUpdate) {
      await updateExistingRepo(spinner, { branch }, dir);
    } else {
      await cloneRepo(spinner, repo, branch, dir);
    }
  });
}

/**
 * Checks if a Git repository exists in the specified directory.
 *
 * @param dir - Directory to check for Git repository
 * @returns true if a Git repository exists, false otherwise
 */
async function repoExists(dir: string): Promise<boolean> {
  try {
    await execa("git", ["-C", dir, "rev-parse", "--git-dir"]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Clones a Git repository from the specified URL to the target directory.
 * Performs a shallow clone with depth 1 to minimize download time and disk usage.
 *
 * @param spinner - Ora spinner for progress indication
 * @param repo - Repository URL to clone from
 * @param branch - Branch to clone
 * @param dir - Target directory for the cloned repository
 */
async function cloneRepo(spinner: Ora, repo: string, branch: string, dir: string): Promise<void> {
  const relativeDir = relative(process.cwd(), dir);

  spinner.text = `Cleaning directory ${pc.cyan(relativeDir)}`;
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  spinner.text = `Cloning repo ${pc.cyan(repo)} at branch ${pc.cyan(branch)} into ${pc.cyan(relativeDir)}`;
  await execWithSpinner(spinner, "git", ["clone", "-b", branch, "--depth", "1", repo, dir]);
}

/**
 * Updates an existing Git repository to the latest state of the specified branch.
 * Performs a complete reset of local changes and pulls the latest commits.
 *
 * @param spinner - Ora spinner for progress indication
 * @param suite - Object containing the branch to checkout
 * @param dir - Directory containing the Git repository to update
 */
export async function updateExistingRepo(
  spinner: Ora,
  { branch }: Pick<IntegrationTestSuite, "branch">,
  dir: string,
): Promise<void> {
  const baseText = spinner.text;

  spinner.text = `${baseText} - Resetting local changes`;
  await execWithSpinner(spinner, "git", ["reset", "--hard", "HEAD"], { cwd: dir });
  await execWithSpinner(spinner, "git", ["clean", "-fd"], { cwd: dir });

  spinner.text = `${baseText} - Fetching latest changes`;
  await execWithSpinner(spinner, "git", ["fetch", "origin"], { cwd: dir });

  spinner.text = `${baseText} - Checking out branch ${pc.cyan(branch)}`;
  await execWithSpinner(spinner, "git", ["checkout", branch], { cwd: dir });

  spinner.text = `${baseText} - Pulling latest changes`;
  await execWithSpinner(spinner, "git", ["pull", "origin", branch], { cwd: dir });
}

/**
 * Validates that the Git repository has no uncommitted changes.
 * Logs the status and diff if changes are detected.
 *
 * @param dir - Directory containing the Git repository to validate
 */
export async function validateGitClean(dir: string): Promise<void> {
  const result = await execa("git", ["status", "--porcelain"], { cwd: dir });
  const gitChanges = result.stdout.trim();

  if (gitChanges) {
    log(`${pc.red("x")} Git changes detected after validation:`);
    log(gitChanges);

    const diffResult = await execa("git", ["diff", "--color=always"], { cwd: dir });
    log(diffResult.stdout);
  } else {
    log(`${pc.green("✔")} No git changes detected`);
  }
}
