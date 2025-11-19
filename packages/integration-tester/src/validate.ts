import { execa } from "execa";
import { readdir } from "fs/promises";
import { globby } from "globby";
import { cpus } from "os";
import { dirname, join, relative } from "pathe";
import pc from "picocolors";
import type { Entrypoint, IntegrationTestSuite } from "./config/types.js";
import type { TaskRunner } from "./runner.js";
import { log, runWithConcurrency, ValidationFailedError } from "./utils.js";

// Number of parallel TypeSpec compilations to run
const COMPILATION_CONCURRENCY = cpus().length;

export async function validateSpecs(
  runner: TaskRunner,
  dir: string,
  suite: IntegrationTestSuite,
): Promise<void> {
  const tspConfigDirs = await findTspProjects(dir, suite.pattern ?? "**/tspconfig.yaml");

  if (tspConfigDirs.length === 0) {
    log("No tspconfig.yaml files found in specification directory");
    return;
  }

  runner.group(
    `Found ${pc.yellow(tspConfigDirs.length)} TypeSpec projects`,
    tspConfigDirs.map((projectDir) => pc.bold(relative(dir, projectDir))).join("\n"),
  );

  let successCount = 0;
  let failureCount = 0;
  const failedFolders: string[] = []; // Create a processor function that handles the compilation and logging
  const processProject = async (projectDir: string) => {
    const result = await verifyProject(runner, dir, projectDir, suite);
    runner.reportTaskWithDetails(
      result.success ? "pass" : "fail",
      relative(dir, projectDir),
      result.output,
    );
    return { dir: projectDir, result };
  };

  // Run compilations in parallel with limited concurrency
  const results = await runWithConcurrency(tspConfigDirs, COMPILATION_CONCURRENCY, processProject);

  // Count successes and failures
  for (const { dir, result } of results) {
    if (result.success) {
      successCount++;
    } else {
      failureCount++;
      failedFolders.push(dir);
    }
  }

  log(`\n=== Summary ===`);
  const passed = pc.bold(pc.green(`${successCount} passed`));
  const failed = failureCount > 0 ? pc.bold(pc.red(`${failureCount} failed`)) : undefined;
  log([passed, failed].filter(Boolean).join(pc.gray(" | ")), pc.gray(`(${tspConfigDirs.length})`));

  if (failureCount > 0) {
    log("\nFailed folders:");
    failedFolders.forEach((x) => log(`  - ${relative(dir, x)}`));

    throw new ValidationFailedError();
  }
}

async function findTspProjects(wd: string, pattern: string): Promise<string[]> {
  const result = await globby(pattern, {
    cwd: wd,
    absolute: true,
  });
  return result.map((x) => dirname(x));
}

/** Find which entrypoints are available */
async function findTspEntrypoints(
  directory: string,
  suite: IntegrationTestSuite,
): Promise<Entrypoint[]> {
  try {
    const entries = await readdir(directory);
    return (suite.entrypoints ?? [{ name: "main.tsp" }]).filter((entrypoint) =>
      entries.includes(entrypoint.name),
    );
  } catch (error) {
    return [];
  }
}

async function verifyProject(
  runner: TaskRunner,
  workspaceDir: string,
  dir: string,
  suite: IntegrationTestSuite,
): Promise<{ success: boolean; output: string }> {
  const entrypoints = await findTspEntrypoints(dir, suite);

  if (entrypoints.length === 0) {
    const result = {
      success: false,
      output: `Project '${dir}' has no valid entrypoints to compile. Checked for: ${suite.entrypoints?.map((e) => e.name).join(", ") ?? "main.tsp"}`,
    };
    runner.reportTaskWithDetails("fail", dir, result.output);
    return result;
  }

  let output = "";
  for (const entrypoint of entrypoints) {
    const result = await execTspCompile(
      workspaceDir,
      join(dir, entrypoint.name),
      entrypoint.options,
    );
    if (!result.success) {
      return result;
    } else {
      output += result.output;
      output += `Entrypoint '${entrypoint.name}' compiled successfully.\n`;
    }
  }
  return { success: true, output };
}
async function execTspCompile(
  directory: string,
  file: string,
  args: string[] = [],
): Promise<{ success: boolean; output: string }> {
  const { failed, all } = await execa(
    "npm",
    ["exec", "--no", "--", "tsp", "compile", file, "--warn-as-error", ...args],
    {
      cwd: directory,
      stdio: "pipe",
      all: true,
      reject: false,
      env: { FORCE_COLOR: pc.isColorSupported ? "1" : undefined }, // Force color output
    },
  );
  return {
    success: !failed,
    output: all,
  };
}
