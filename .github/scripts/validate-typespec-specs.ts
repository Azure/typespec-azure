#!/usr/bin/env tsx
/* eslint-disable no-console */

import { spawn } from "child_process";
import { readdir, stat } from "fs/promises";
import { join } from "path";

// Number of parallel TypeSpec compilations to run
const COMPILATION_CONCURRENCY = 4;

async function findTypeSpecProjects(startDir: string): Promise<string[]> {
  const directories: string[] = [];

  async function searchDirectory(dir: string): Promise<void> {
    try {
      const entries = await readdir(dir);

      // Check if this directory has a tspconfig.yaml
      if (entries.includes("tspconfig.yaml")) {
        directories.push(dir);
        return; // Don't search subdirectories if we found a tspconfig.yaml
      }

      // Check if this directory has TypeSpec files but no tspconfig.yaml
      const hasMainTsp = entries.includes("main.tsp");
      const hasClientTsp = entries.includes("client.tsp");
      
      if (hasMainTsp || hasClientTsp) {
        directories.push(dir);
        return; // Don't search subdirectories if we found TypeSpec files
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
  // Check if this directory has a tspconfig.yaml
  const entries = await readdir(directory);
  const hasTspConfig = entries.includes("tspconfig.yaml");
  
  let compileArgs: string[];
  if (hasTspConfig) {
    // Use tsp compile . when there's a tspconfig.yaml
    compileArgs = ["tsp", "compile", ".", "--warn-as-error"];
  } else {
    // Determine entry point when there's no tspconfig.yaml
    const hasMainTsp = entries.includes("main.tsp");
    const hasClientTsp = entries.includes("client.tsp");
    
    if (hasMainTsp) {
      compileArgs = ["tsp", "compile", "main.tsp", "--warn-as-error"];
    } else if (hasClientTsp) {
      compileArgs = ["tsp", "compile", "client.tsp", "--warn-as-error"];
    } else {
      // This shouldn't happen since we only call this function for directories with TypeSpec files
      compileArgs = ["tsp", "compile", ".", "--warn-as-error"];
    }
  }

  return new Promise((resolve) => {
    const process = spawn("npx", compileArgs, {
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

  const tspProjects = await findTypeSpecProjects(join(azureSpecsDir, "specification"));

  if (tspProjects.length === 0) {
    console.log("No TypeSpec projects found in specification directory");
    return;
  }

  console.log(`Found ${tspProjects.length} TypeSpec projects:`);
  tspProjects.forEach((dir) => console.log(`  - ${dir}`));
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
    tspProjects,
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
  console.log(`Total projects: ${tspProjects.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failureCount}`);

  if (failureCount > 0) {
    console.log("\nFailed folders:");
    failedFolders.forEach((folder) => console.log(`  - ${folder}`));

    // Exit with failure code to make the GitHub Actions job fail
    process.exit(1);
  }
}

main().catch(console.error);
