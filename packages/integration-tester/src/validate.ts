import { execa } from "execa";
import { readdir } from "fs/promises";
import { globby } from "globby";
import { dirname } from "pathe";
import pc from "picocolors";
import type { IntegrationTestSuite } from "./config/types.js";
import { log } from "./utils.js";

// Number of parallel TypeSpec compilations to run
const COMPILATION_CONCURRENCY = 4;

export async function validateSpecs(dir: string, suite: IntegrationTestSuite): Promise<void> {
  const tspConfigDirs = await findTspProjects(dir, suite.pattern ?? "**/tspconfig.yaml");

  if (tspConfigDirs.length === 0) {
    log("No tspconfig.yaml files found in specification directory");
    return;
  }

  logGroup(
    `Found ${pc.yellow(tspConfigDirs.length)} TypeSpec projects`,
    tspConfigDirs.map((dir) => pc.bold(dir)).join("\n"),
  );

  let successCount = 0;
  let failureCount = 0;
  const failedFolders: string[] = []; // Create a processor function that handles the compilation and logging
  const processProject = async (dir: string) => {
    const result = await verifyProject(dir);
    const status = result.success ? pc.green("pass") : pc.red("fail");

    logGroup(`${status} ${dir}`, result.output);

    return { dir, result };
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
  log(`Total projects: ${tspConfigDirs.length}`);
  log(`Successful: ${successCount}`);
  log(`Failed: ${failureCount}`);

  if (failureCount > 0) {
    log("\nFailed folders:");
    failedFolders.forEach((folder) => log(`  - ${folder}`));

    // Exit with failure code to make the GitHub Actions job fail
    process.exit(1);
  }
}

async function findTspProjects(wd: string, pattern: string): Promise<string[]> {
  const result = await globby(pattern, {
    cwd: wd,
    absolute: true,
  });
  return result.map((x) => dirname(x));
}

async function findTspEntrypoint(directory: string): Promise<string | null> {
  try {
    const entries = await readdir(directory);

    // Prefer main.tsp, fall back to client.tsp
    if (entries.includes("main.tsp")) {
      return "main.tsp";
    }
    if (entries.includes("client.tsp")) {
      return "client.tsp";
    }

    return null;
  } catch (error) {
    return null;
  }
}

async function verifyProject(dir: string): Promise<{ success: boolean; output: string }> {
  const entrypoint = await findTspEntrypoint(dir);

  if (!entrypoint) {
    const result = {
      success: false,
      output: "No main.tsp or client.tsp file found in directory",
    };
    const status = pc.red("fail");
    logGroup(`${status} ${dir}`, result.output);
    return result;
  }

  return execTspCompile(dir, entrypoint, entrypoint === "client.tsp" ? ["--dry-run"] : []);
}
async function execTspCompile(
  directory: string,
  file: string,
  args: string[] = [],
): Promise<{ success: boolean; output: string }> {
  const { all } = await execa("npx", ["tsp", "compile", file, "--warn-as-error", ...args], {
    cwd: directory,
    stdio: "pipe",
    all: true,
    env: { FORCE_COLOR: pc.isColorSupported ? "1" : undefined }, // Force color output
  });
  return {
    success: true,
    output: all,
  };
}

// Function to run tasks with limited concurrency
async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  processor: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }

  return results;
}

function logGroup(name: string, content: string) {
  if (process.env.GITHUB_ACTIONS) {
    // eslint-disable-next-line no-console
    console.log(`::group::${name}`);
    // eslint-disable-next-line no-console
    console.log(content);
    // eslint-disable-next-line no-console
    console.log("::endgroup::");
  } else {
    // eslint-disable-next-line no-console
    console.group(name);
    // eslint-disable-next-line no-console
    console.log(content);
    // eslint-disable-next-line no-console
    console.groupEnd();
  }
}
