import { spawnSync, type SpawnSyncReturns } from "child_process";
import { readFileSync } from "fs";
import path from "path";
import process from "process";

type StepStatus = "passed" | "failed" | "warning" | "skipped";

type Options = {
  fix: boolean;
  skipBuild: boolean;
  skipTest: boolean;
  base: string;
  verbose: boolean;
  help: boolean;
};

type CommandResult = {
  command: string;
  args: string[];
  result: SpawnSyncReturns<string>;
  stdout: string;
  stderr: string;
};

type StepResult = {
  label: string;
  status: StepStatus;
  durationMs: number;
  details: string[];
};

const RESET = "\u001b[0m";
const GREEN = "\u001b[32m";
const RED = "\u001b[31m";
const YELLOW = "\u001b[33m";
const CYAN = "\u001b[36m";
const BOLD = "\u001b[1m";
const LINE = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
const STATUS_ICON: Record<StepStatus, string> = {
  passed: `${GREEN}✅${RESET}`,
  failed: `${RED}❌${RESET}`,
  warning: `${YELLOW}⚠️${RESET}`,
  skipped: `${YELLOW}⚠️${RESET}`,
};

const repoRoot = path.resolve(process.cwd());
const options = parseArgs(process.argv.slice(2));

if (options.help) {
  printUsage();
  process.exit(0);
}

const diffCache = new Map<string, string[]>();
const changedFilesExclusions = loadChangedFilesExclusions();
const steps: StepResult[] = [];

printHeader();

steps.push(runStep("Branch is up to date", checkBranchUpToDate));
steps.push(runStep("Build succeeds", checkBuild));
steps.push(runStep("Tests pass", checkTests));
steps.push(runStep("Lint passes", checkLint));
steps.push(runStep("Format check passes", checkFormat));
steps.push(runStep("Spelling check passes", checkSpelling));
steps.push(runStep("Regen-docs is clean", checkRegenDocs));
steps.push(runStep("Changeset exists", checkChangeset));
steps.push(runStep("Diff is clean", checkDiff));

printSummary(steps);

const hasFailures = steps.some((step) => step.status === "failed");
process.exit(hasFailures ? 1 : 0);

function parseArgs(args: string[]): Options {
  const parsed: Options = {
    fix: false,
    skipBuild: false,
    skipTest: false,
    base: "origin/main",
    verbose: false,
    help: false,
  };

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];

    switch (arg) {
      case "--fix":
        parsed.fix = true;
        break;
      case "--skip-build":
        parsed.skipBuild = true;
        break;
      case "--skip-test":
        parsed.skipTest = true;
        break;
      case "--base": {
        const value = args[index + 1];
        if (!value) {
          failWithUsage("Missing value for --base");
        }
        parsed.base = value;
        index++;
        break;
      }
      case "--verbose":
        parsed.verbose = true;
        break;
      case "--help":
        parsed.help = true;
        break;
      default:
        failWithUsage(`Unknown option: ${arg}`);
    }
  }

  return parsed;
}

function failWithUsage(message: string): never {
  console.error(`${RED}Error:${RESET} ${message}`);
  console.log();
  printUsage();
  process.exit(1);
}

function printUsage(): void {
  console.log(
    [
      "Usage: pnpm validate:pr [options]",
      "",
      "Options:",
      "  --fix              Auto-fix formatting and lint issues",
      "  --skip-build       Skip the build step",
      "  --skip-test        Skip the test step",
      "  --base <branch>    Base branch for diff comparison (default: origin/main)",
      "  --verbose          Show detailed command output",
      "  --help             Show usage",
    ].join("\n"),
  );
}

function printHeader(): void {
  console.log(`${BOLD}Pre-PR Validation${RESET}`);
  console.log(LINE);
  console.log();
}

function printSummary(results: StepResult[]): void {
  const passed = results.filter((step) => step.status === "passed").length;
  const warnings = results.filter((step) => step.status === "warning").length;
  const skipped = results.filter((step) => step.status === "skipped").length;
  const failed = results.filter((step) => step.status === "failed").length;

  console.log();
  console.log(LINE);

  if (failed > 0) {
    console.log(`Result: ${passed}/${results.length} passed ${RED}❌${RESET}`);
    return;
  }

  if (warnings > 0 || skipped > 0) {
    const extra: string[] = [];
    if (warnings > 0) {
      extra.push(`${warnings} warning${warnings === 1 ? "" : "s"}`);
    }
    if (skipped > 0) {
      extra.push(`${skipped} skipped`);
    }
    console.log(
      `Result: ${passed}/${results.length} passed ${GREEN}✅${RESET} (${extra.join(", ")})`,
    );
    return;
  }

  console.log(`Result: ${passed}/${results.length} passed ${GREEN}✅${RESET}`);
}

function runStep(
  label: string,
  action: () => Omit<StepResult, "label" | "durationMs">,
): StepResult {
  const start = Date.now();

  try {
    const outcome = action();
    const step = {
      label,
      status: outcome.status,
      details: outcome.details,
      durationMs: Date.now() - start,
    };
    printStep(steps.length + 1, step);
    return step;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const step = {
      label,
      status: "failed" as const,
      details: [message],
      durationMs: Date.now() - start,
    };
    printStep(steps.length + 1, step);
    return step;
  }
}

function printStep(index: number, step: StepResult): void {
  const prefix = ` ${index}. ${step.label} `;
  const dots = ".".repeat(Math.max(2, 58 - prefix.length));
  console.log(`${prefix}${dots} ${STATUS_ICON[step.status]} (${formatDuration(step.durationMs)})`);

  for (const detail of step.details) {
    if (!detail) continue;
    for (const line of detail.split(/\r?\n/)) {
      console.log(`    ${line}`);
    }
  }
}

function formatDuration(durationMs: number): string {
  return `${(durationMs / 1000).toFixed(1)}s`;
}

function checkBranchUpToDate(): Omit<StepResult, "label" | "durationMs"> {
  const fetchResult = fetchBaseBranch(options.base);
  if (!isSuccess(fetchResult.result)) {
    return failFromCommand(fetchResult, `Unable to fetch ${options.base}.`);
  }

  const baseExists = runCommand("git", ["rev-parse", "--verify", options.base]);
  if (!isSuccess(baseExists.result)) {
    return failFromCommand(baseExists, `Base reference ${options.base} was not found.`);
  }

  const ancestorCheck = runCommand("git", ["merge-base", "--is-ancestor", options.base, "HEAD"]);
  const mergeTreeCheck = runCommand("git", ["merge-tree", "--write-tree", options.base, "HEAD"]);

  if (!isSuccess(mergeTreeCheck.result)) {
    return {
      status: "failed",
      details: [
        `Potential merge conflicts detected with ${options.base}. Rebase before opening the PR.`,
        ...commandOutput(mergeTreeCheck),
      ],
    };
  }

  if (!isSuccess(ancestorCheck.result)) {
    return {
      status: "warning",
      details: [
        `Branch is behind ${options.base}. Run: git fetch origin main && git rebase ${options.base}`,
      ],
    };
  }

  return { status: "passed", details: [] };
}

function checkBuild(): Omit<StepResult, "label" | "durationMs"> {
  if (options.skipBuild) {
    return { status: "skipped", details: ["Skipped by --skip-build."] };
  }

  const result = runCommand("pnpm", ["build"]);
  if (!isSuccess(result.result)) {
    return failFromCommand(result, "Build failed.");
  }

  return { status: "passed", details: [] };
}

function checkTests(): Omit<StepResult, "label" | "durationMs"> {
  if (options.skipTest) {
    return { status: "skipped", details: ["Skipped by --skip-test."] };
  }

  const result = runCommand("pnpm", ["test"]);
  if (!isSuccess(result.result)) {
    return failFromCommand(result, "Test failures found.");
  }

  return { status: "passed", details: [] };
}

function checkLint(): Omit<StepResult, "label" | "durationMs"> {
  const command = options.fix ? ["lint:fix"] : ["lint"];
  const result = runCommand("pnpm", command);

  if (!isSuccess(result.result)) {
    return failFromCommand(
      result,
      options.fix ? "Lint auto-fix failed." : "Lint errors found. Run: pnpm lint:fix",
    );
  }

  return { status: "passed", details: [] };
}

function checkFormat(): Omit<StepResult, "label" | "durationMs"> {
  if (options.fix) {
    const formatResult = runCommand("pnpm", ["format"]);
    if (!isSuccess(formatResult.result)) {
      return failFromCommand(formatResult, "Formatting failed.");
    }
  }

  const checkResult = runCommand("pnpm", ["format:check"]);
  if (!isSuccess(checkResult.result)) {
    return failFromCommand(
      checkResult,
      options.fix
        ? "Formatting still has issues after pnpm format."
        : "Formatting issues found. Run: pnpm format",
    );
  }

  return {
    status: "passed",
    details: options.fix ? ["Applied formatting fixes before re-checking."] : [],
  };
}

function checkSpelling(): Omit<StepResult, "label" | "durationMs"> {
  const result = runCommand("pnpm", ["cspell"]);
  if (!isSuccess(result.result)) {
    return failFromCommand(result, "Spelling issues found.");
  }

  return { status: "passed", details: [] };
}

function checkRegenDocs(): Omit<StepResult, "label" | "durationMs"> {
  if (options.skipBuild) {
    return { status: "skipped", details: ["Skipped because --skip-build also skips regen-docs."] };
  }

  const regenResult = runCommand("pnpm", ["regen-docs"]);
  if (!isSuccess(regenResult.result)) {
    return failFromCommand(regenResult, "Doc regeneration failed.");
  }

  const diffResult = runCommand("git", ["diff", "--name-only", "--", "docs", "website"]);
  if (!isSuccess(diffResult.result)) {
    return failFromCommand(diffResult, "Unable to inspect regenerated docs.");
  }

  const changedDocs = splitLines(diffResult.stdout);
  if (changedDocs.length > 0) {
    return {
      status: "failed",
      details: ["Generated docs are stale. Run: pnpm regen-docs", ...changedDocs],
    };
  }

  return { status: "passed", details: [] };
}

function checkChangeset(): Omit<StepResult, "label" | "durationMs"> {
  const changedFiles = getDiffFiles(options.base);
  if (!changedFiles) {
    return {
      status: "failed",
      details: [`Unable to diff against ${options.base}.`],
    };
  }

  const sourceFiles = changedFiles.filter((file) => {
    const normalized = normalizePath(file);
    if (normalized.startsWith(".chronus/changes/")) {
      return false;
    }
    return !matchesExcludedFile(normalized);
  });

  if (sourceFiles.length === 0) {
    return { status: "skipped", details: ["No source file changes detected."] };
  }

  const changesetResult = runCommand("git", [
    "diff",
    "--name-only",
    "--diff-filter=A",
    `${options.base}...HEAD`,
    "--",
    ".chronus/changes/",
  ]);

  if (!isSuccess(changesetResult.result)) {
    return failFromCommand(changesetResult, "Unable to inspect changesets.");
  }

  const addedChangesets = splitLines(changesetResult.stdout);
  if (addedChangesets.length === 0) {
    return {
      status: "failed",
      details: [
        "Source files changed but no new changeset was added under .chronus/changes/.",
        "Run: pnpm change add",
      ],
    };
  }

  return { status: "passed", details: [] };
}

function checkDiff(): Omit<StepResult, "label" | "durationMs"> {
  const changedFiles = getDiffFiles(options.base);
  if (!changedFiles) {
    return {
      status: "failed",
      details: [`Unable to diff against ${options.base}.`],
    };
  }

  const details = changedFiles.length > 0 ? [...changedFiles] : ["No files changed."];
  const warnings: string[] = [];
  const hasPackageJsonChange = changedFiles.some((file) =>
    normalizePath(file).endsWith("package.json"),
  );

  if (changedFiles.some((file) => /(^|\/)dist\//.test(normalizePath(file)))) {
    warnings.push("PR diff includes files under dist/.");
  }

  if (changedFiles.some((file) => normalizePath(file).endsWith(".lock.yml"))) {
    warnings.push("PR diff includes *.lock.yml files (often generated by gh-aw).");
  }

  if (
    changedFiles.some((file) => normalizePath(file) === "pnpm-lock.yaml") &&
    !hasPackageJsonChange
  ) {
    warnings.push("pnpm-lock.yaml changed without any package.json change.");
  }

  if (changedFiles.some((file) => /(^|\/)node_modules\//.test(normalizePath(file)))) {
    warnings.push("PR diff includes files under node_modules/.");
  }

  if (warnings.length > 0) {
    return {
      status: "warning",
      details: [...details, ...warnings.map((warning) => `Warning: ${warning}`)],
    };
  }

  return { status: "passed", details };
}

function fetchBaseBranch(base: string): CommandResult {
  const remoteMatch = /^([^/]+)\/(.+)$/.exec(base);
  if (remoteMatch) {
    const [, remote, branch] = remoteMatch;
    return runCommand("git", ["fetch", remote, branch, "--quiet"]);
  }

  return runCommand("git", ["fetch", "origin", "main", "--quiet"]);
}

function getDiffFiles(base: string): string[] | undefined {
  const cached = diffCache.get(base);
  if (cached) {
    return cached;
  }

  const diffResult = runCommand("git", ["diff", "--name-only", `${base}...HEAD`]);
  if (!isSuccess(diffResult.result)) {
    if (options.verbose) {
      for (const line of commandOutput(diffResult)) {
        console.log(`    ${line}`);
      }
    }
    return undefined;
  }

  const files = splitLines(diffResult.stdout);
  diffCache.set(base, files);
  return files;
}

function loadChangedFilesExclusions(): RegExp[] {
  const configPath = path.join(repoRoot, ".chronus", "config.yaml");

  try {
    const config = readFileSync(configPath, "utf-8");
    const patterns: string[] = [];
    let inChangedFiles = false;

    for (const line of config.split(/\r?\n/)) {
      if (!inChangedFiles) {
        if (line.trim() === "changedFiles:") {
          inChangedFiles = true;
        }
        continue;
      }

      const match = /^\s*-\s*"?(![^"#]+)"?\s*$/.exec(line);
      if (!match) {
        if (/^\S/.test(line)) {
          break;
        }
        continue;
      }

      patterns.push(match[1]);
    }

    return patterns.map(globToRegExp);
  } catch {
    return [/\.md$/i, /\.test\.ts$/i, /\.e2e\.ts$/i];
  }
}

function globToRegExp(pattern: string): RegExp {
  const normalized = normalizePath(pattern.replace(/^!/, ""));
  const escaped = normalized.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const regexSource = escaped
    .replace(/\*\*\//g, "(?:.*/)?")
    .replace(/\*\*/g, ".*")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, ".");
  return new RegExp(`^${regexSource}$`, "i");
}

function matchesExcludedFile(file: string): boolean {
  return changedFilesExclusions.some((pattern) => pattern.test(file));
}

function runCommand(command: string, args: string[]): CommandResult {
  const display = formatCommand(command, args);

  if (options.verbose) {
    console.log(`${CYAN}$ ${display}${RESET}`);
  }

  const result = spawnSync(command, args, {
    cwd: repoRoot,
    shell: true,
    encoding: "utf-8",
    maxBuffer: 50 * 1024 * 1024,
  });

  const stdout = (result.stdout ?? "").trimEnd();
  const stderr = (result.stderr ?? "").trimEnd();

  if (options.verbose) {
    if (stdout) {
      console.log(stdout);
    }
    if (stderr) {
      console.error(stderr);
    }
  }

  return { command, args, result, stdout, stderr };
}

function isSuccess(result: SpawnSyncReturns<string>): boolean {
  return !result.error && result.status === 0;
}

function failFromCommand(
  command: CommandResult,
  message: string,
): Omit<StepResult, "label" | "durationMs"> {
  return {
    status: "failed",
    details: [message, ...commandOutput(command)],
  };
}

function commandOutput(command: CommandResult): string[] {
  const lines = [`Command: ${formatCommand(command.command, command.args)}`];

  if (command.result.error) {
    lines.push(`Error: ${command.result.error.message}`);
  }
  if (command.stderr) {
    lines.push(command.stderr);
  }
  if (command.stdout) {
    lines.push(command.stdout);
  }
  if (!command.stderr && !command.stdout && typeof command.result.status === "number") {
    lines.push(`Exit code: ${command.result.status}`);
  }

  return lines;
}

function formatCommand(command: string, args: string[]): string {
  return [command, ...args].map((part) => (/\s/.test(part) ? `"${part}"` : part)).join(" ");
}

function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizePath(file: string): string {
  return file.replace(/\\/g, "/");
}
