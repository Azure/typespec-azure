import { execSync } from "node:child_process";

export const DEFAULT_BRANCH = "benchmark-data";

export function git(args: string, cwd?: string): string {
  return execSync(`git ${args}`, { encoding: "utf-8", cwd }).trim();
}

export function gitSilent(args: string, cwd?: string): boolean {
  try {
    execSync(`git ${args}`, { cwd, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** Run a shell command, returning stdout. Throws on failure. */
export function exec(cmd: string, options?: { cwd?: string; quiet?: boolean }): string {
  return execSync(cmd, {
    encoding: "utf-8",
    cwd: options?.cwd,
    stdio: options?.quiet ? "ignore" : undefined,
    maxBuffer: 50_000_000,
  }).trim();
}

/** Run a shell command, returning true on success, false on failure. */
export function execOk(cmd: string, options?: { cwd?: string }): boolean {
  try {
    execSync(cmd, { cwd: options?.cwd, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** Give git an identity to commit under, which a CI checkout does not have. */
export function configureGitIdentity(cwd?: string): void {
  git('config user.name "github-actions[bot]"', cwd);
  git('config user.email "github-actions[bot]@users.noreply.github.com"', cwd);
}

/** List existing result SHAs on the benchmark-data branch. */
export function listExistingResults(
  branch: string = DEFAULT_BRANCH,
  dir: string = "results",
): Set<string> {
  const existing = new Set<string>();
  try {
    const fileList = git(`ls-tree --name-only origin/${branch} -- ${dir}/`);
    for (const line of fileList.split("\n")) {
      const trimmed = line.trim();
      if (
        trimmed.endsWith(".json") &&
        !trimmed.includes("latest.json") &&
        !trimmed.includes("history.json")
      ) {
        const sha = trimmed.replace(`${dir}/`, "").replace(".json", "");
        existing.add(sha);
      }
    }
  } catch {
    // Branch doesn't exist or no results directory
  }
  return existing;
}

/** List result blob paths on a data branch, newest-first ordering not guaranteed. */
export function listResultBlobs(
  branch: string = DEFAULT_BRANCH,
  dir: string = "results",
): string[] {
  // `:(top)` anchors the pathspec at the repo root so this works from any cwd.
  return git(`ls-tree --name-only --full-tree ${branch} -- ":(top)${dir}/"`)
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (f) => f.endsWith(".json") && !f.includes("latest.json") && !f.includes("history.json"),
    );
}

/** Blobs read per `git cat-file` call, balancing subprocess count against memory. */
const BLOB_BATCH_SIZE = 50;

/**
 * Read blobs from a git branch in batches.
 *
 * One `git show` per file costs a process spawn per result, which dominates
 * the history rebuild once the series is a few hundred runs long. `cat-file
 * --batch` reads a whole group in one go, and batching keeps the decoded
 * output bounded instead of materializing the entire branch at once.
 */
export function* readBlobs(
  paths: string[],
  branch: string = DEFAULT_BRANCH,
): Generator<{ name: string; content: string }> {
  for (let start = 0; start < paths.length; start += BLOB_BATCH_SIZE) {
    const batch = paths.slice(start, start + BLOB_BATCH_SIZE);
    // Kept as a buffer: `cat-file` reports blob sizes in bytes, which only
    // line up with string offsets while every blob happens to be ASCII.
    const stdout: Buffer = execSync(`git cat-file --batch`, {
      input: batch.map((path) => `${branch}:${path}`).join("\n") + "\n",
      maxBuffer: 500_000_000,
    });

    // Each blob arrives as `<sha> blob <size>\n<size bytes>\n`.
    let offset = 0;
    for (let i = 0; i < batch.length; i++) {
      const headerEnd = stdout.indexOf(0x0a, offset);
      if (headerEnd === -1) return;
      const size = Number(stdout.toString("utf-8", offset, headerEnd).split(" ")[2]);
      if (!Number.isFinite(size)) {
        // Missing object: git emits `<name> missing` with no body.
        offset = headerEnd + 1;
        continue;
      }
      const bodyStart = headerEnd + 1;
      yield { name: batch[i], content: stdout.toString("utf-8", bodyStart, bodyStart + size) };
      offset = bodyStart + size + 1;
    }
  }
}
