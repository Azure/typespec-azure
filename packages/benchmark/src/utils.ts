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

/** List existing result SHAs on the benchmark-data branch. */
export function listExistingResults(branch: string = DEFAULT_BRANCH): Set<string> {
  const existing = new Set<string>();
  try {
    const fileList = git(`ls-tree --name-only origin/${branch} -- results/`);
    for (const line of fileList.split("\n")) {
      const trimmed = line.trim();
      if (
        trimmed.endsWith(".json") &&
        !trimmed.includes("latest.json") &&
        !trimmed.includes("history.json")
      ) {
        const sha = trimmed.replace("results/", "").replace(".json", "");
        existing.add(sha);
      }
    }
  } catch {
    // Branch doesn't exist or no results directory
  }
  return existing;
}
