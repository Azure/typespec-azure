import { spawn, spawnSync } from "child_process";
import { lstatSync, readdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const coreRepoRoot = resolve(repoRoot, "core");
export const autorest = resolve(repoRoot, "eng/scripts/node_modules/.bin/autorest");

// We could use { shell: true } to let Windows find .cmd, but that causes other issues.
// It breaks ENOENT checking for command-not-found and also handles command/args with spaces
// poorly.
const isCmdOnWindows = ["pnpm", "npm", "code", "code-insiders", autorest];

export class CommandFailedError extends Error {
  constructor(msg, proc) {
    super(msg);
    this.proc = proc;
  }
}

export function run(command, args, options) {
  if (!options?.silent) {
    console.log();
    console.log(`> ${command} ${args.join(" ")}`);
  }

  options = {
    stdio: "inherit",
    sync: true,
    throwOnNonZeroExit: true,
    ...options,
  };

  if (process.platform === "win32" && isCmdOnWindows.includes(command)) {
    command += ".cmd";
  }

  const proc = (options.sync ? spawnSync : spawn)(command, args, options);
  if (proc.error) {
    if (options.ignoreCommandNotFound && proc.error.code === "ENOENT") {
      console.log(`Skipped: Command \`${command}\` not found.`);
    } else {
      throw proc.error;
    }
  } else if (options.throwOnNonZeroExit && proc.status !== undefined && proc.status !== 0) {
    throw new CommandFailedError(
      `Command \`${command} ${args.join(" ")}\` failed with exit code ${proc.status}`,
      proc,
    );
  }

  return proc;
}

export function scanSwaggers(root) {
  const files = [];
  for (const file of readdirSync(root)) {
    const fullPath = root + "/" + file;
    if (lstatSync(fullPath).isDirectory()) {
      scanSwaggers(fullPath).forEach((x) => files.push(x));
    }
    if (file === "openapi.json") {
      files.push(fullPath);
    }
  }
  return files;
}

export async function checkForChangedFiles(cwd, comment = undefined, options = {}) {
  if (comment && !options.silent) {
    console.log();
    console.log(comment);
  }

  const proc = run("git", ["status", "--porcelain"], {
    encoding: "utf-8",
    stdio: [null, "pipe", "pipe"],
    cwd,
    ...options,
  });

  if (proc.stdout && !options.silent) {
    console.log(proc.stdout);
  }

  if (proc.stderr && !options.silent) {
    console.error(proc.stderr);
  }

  return proc.stdout || proc.stderr;
}
