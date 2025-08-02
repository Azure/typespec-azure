import { execa } from "execa";
import { mkdir, rm } from "fs/promises";
import type { Ora } from "ora";
import { relative } from "pathe";
import pc from "picocolors";
import type { IntegrationTestSuite } from "./config/types.js";
import { action, execWithSpinner } from "./utils.js";

export interface EnsureRepoStateOptions {
  clean?: boolean;
}
export async function ensureRepoState(
  { repo, branch }: IntegrationTestSuite,
  dir: string,
  options: EnsureRepoStateOptions = {},
): Promise<void> {
  await action(`Checkout repo ${pc.cyan(repo)} at branch ${pc.cyan(branch)}`, async (spinner) => {
    const update = options.clean ? false : await repoExists(dir);
    if (update) {
      await updateExistingRepo(spinner, { branch }, dir);
    } else {
      await cloneRepo(spinner, repo, branch, dir);
    }
  });
}

async function repoExists(dir: string): Promise<boolean> {
  try {
    await execa("git", ["-C", dir, "rev-parse", "--git-dir"]);
    return true;
  } catch {
    return false;
  }
}

async function cloneRepo(spinner: Ora, repo: string, branch: string, dir: string): Promise<void> {
  const relativeDir = relative(process.cwd(), dir);
  spinner.text = `Cleaning directory ${pc.cyan(relativeDir)}`;
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  spinner.text = `Cloning repo ${pc.cyan(repo)} at branch ${pc.cyan(branch)} into ${pc.cyan(relativeDir)}`;
  await execWithSpinner(spinner, "git", ["clone", "-b", branch, "--depth", "1", repo, dir]);
}

export async function updateExistingRepo(
  spinner: Ora,
  { branch }: Pick<IntegrationTestSuite, "branch">,
  dir: string,
): Promise<void> {
  const base = spinner.text;
  spinner.text = `${base} - Resetting local changes`;
  await execWithSpinner(spinner, "git", ["-C", dir, "reset", "--hard", "HEAD"]);
  await execWithSpinner(spinner, "git", ["-C", dir, "clean", "-fd"]);

  spinner.text = `${base} - Fetching latest changes`;
  await execWithSpinner(spinner, "git", ["-C", dir, "fetch", "origin"]);

  spinner.text = `${base} - Checking out branch ${pc.cyan(branch)}`;
  await execWithSpinner(spinner, "git", ["-C", dir, "checkout", branch]);

  spinner.text = `${base} - Pulling latest changes`;
  await execWithSpinner(spinner, "git", ["-C", dir, "pull", "origin", branch]);
}
