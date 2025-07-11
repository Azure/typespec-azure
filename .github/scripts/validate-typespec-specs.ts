#!/usr/bin/env tsx
/* eslint-disable no-console */

import { spawn, SpawnOptions } from "child_process";
import { readdir, stat } from "fs/promises";
import { join } from "path";
import pc from "picocolors";

// Number of parallel TypeSpec compilations to run
const COMPILATION_CONCURRENCY = 4;

async function findTspProjects(startDir: string): Promise<string[]> {
  const directories: string[] = [];

  async function searchDirectory(dir: string): Promise<void> {
    try {
      const entries = await readdir(dir);

      // Check if this directory has a tspconfig.yaml
      if (entries.includes("tspconfig.yaml")) {
        directories.push(dir);
        return; // Don't search subdirectories if we found a tspconfig.yaml
      }

      // Search subdirectories
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        try {
          const stats = await stat(fullPath);
          if (stats.isDirectory() && !entry.startsWith(".") && entry !== "node_modules") {
            await searchDirectory(fullPath);
          }
        } catch (error) {
          // Skip directories we can't access
          continue;
        }
      }
    } catch (error) {
      // Skip directories we can't access
      return;
    }
  }

  await searchDirectory(startDir);
  return directories;
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
  const entryPoint = await findTspEntrypoint(dir);

  if (!entryPoint) {
    const result = {
      success: false,
      output: "No main.tsp or client.tsp file found in directory",
    };
    const status = pc.red("fail");
    logGroup(`${status} ${dir}`, result.output);
    return result;
  }

  return runTspCompile2(dir, entryPoint);
}
async function runTspCompile2(
  directory: string,
  file: string,
): Promise<{ success: boolean; output: string }> {
  return execAsync("npx", ["tsp", "compile", file, "--warn-as-error"], {
    cwd: directory,
  });
}

async function execAsync(
  command: string,
  args: string[],
  options: SpawnOptions = {},
): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    const process = spawn(command, args, {
      ...options,
      stdio: "pipe",
    });

    let output = "";

    process.stdout.on("data", (data) => {
      output += data.toString();
    });

    process.stderr.on("data", (data) => {
      output += data.toString();
    });

    process.on("close", (code) => {
      resolve({
        success: code === 0,
        output: output,
      });
    });
  });
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

async function main() {
  const azureSpecsDir = process.argv[2];

  if (!azureSpecsDir) {
    console.error("Usage: tsx validate-typespec-specs.ts <azure-specs-dir>");
    process.exit(1);
  }

  console.log(`Looking for TypeSpec projects in ${azureSpecsDir}...`);

  const tspConfigDirs = await findTspProjects(join(azureSpecsDir, "specification"));

  if (tspConfigDirs.length === 0) {
    console.log("No tspconfig.yaml files found in specification directory");
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

  console.log(`\n=== Summary ===`);
  console.log(`Total projects: ${tspConfigDirs.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failureCount}`);

  if (failureCount > 0) {
    console.log("\nFailed folders:");
    failedFolders.forEach((folder) => console.log(`  - ${folder}`));

    // Exit with failure code to make the GitHub Actions job fail
    process.exit(1);
  }
}

function logGroup(name: string, content: string) {
  console.log(`::group::${name}`);
  console.log(content);
  console.log("::endgroup::");
}

await main();
