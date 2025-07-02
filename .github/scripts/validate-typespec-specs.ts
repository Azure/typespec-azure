#!/usr/bin/env tsx
/* eslint-disable no-console */

import { spawn } from "child_process";
import { readdir, stat } from "fs/promises";
import { join } from "path";

// Number of parallel TypeSpec compilations to run
const COMPILATION_CONCURRENCY = 4;

async function findTspConfigDirectories(startDir: string): Promise<string[]> {
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

async function runTspCompile(directory: string): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    const process = spawn("npx", ["tsp", "compile", "."], {
      cwd: directory,
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

  const tspConfigDirs = await findTspConfigDirectories(join(azureSpecsDir, "specification"));

  if (tspConfigDirs.length === 0) {
    console.log("No tspconfig.yaml files found in specification directory");
    return;
  }

  console.log(`Found ${tspConfigDirs.length} TypeSpec projects:`);
  tspConfigDirs.forEach((dir) => console.log(`  - ${dir}`));
  console.log("");

  let successCount = 0;
  let failureCount = 0;
  const failedFolders: string[] = [];

  // Create a processor function that handles the compilation and logging
  const processDirectory = async (dir: string) => {
    const result = await runTspCompile(dir);

    // Buffer all output to log as a complete group
    let groupOutput = "";

    if (result.success) {
      groupOutput += "✅ Compilation successful\n";
    } else {
      groupOutput += "❌ Compilation failed\n";
    }

    if (result.output.trim()) {
      groupOutput += "Output:\n";
      groupOutput += result.output + "\n";
    }

    // Log the complete group all at once
    console.log(`::group::Compiling TypeSpec project in ${dir}`);
    console.log(groupOutput.trim());
    console.log("::endgroup::");

    return { dir, result };
  };

  // Run compilations in parallel with limited concurrency
  const results = await runWithConcurrency(
    tspConfigDirs,
    COMPILATION_CONCURRENCY,
    processDirectory,
  );

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
  }
}

main().catch(console.error);
