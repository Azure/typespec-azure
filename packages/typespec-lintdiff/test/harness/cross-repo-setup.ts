#!/usr/bin/env node

/**
 * Setup script for the cross-repo comparison tool.
 *
 * Automates the prerequisite steps needed before running `npm run compare`:
 *   1. Builds the local linter package
 *   2. Links the local linter globally via npm link
 *   3. Links the local linter into the target specs repo
 *   4. Verifies the link is functional
 *
 * Usage:
 *   npm run compare:setup -- --specs-repo <path>
 *
 * This only needs to be run once per environment (or after a clean install).
 */

import * as path from "path";
import * as fs from "fs";
import { execSync } from "child_process";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const LINTER_DIR = path.resolve(import.meta.dirname, "..", "..");

function parseArgs(): { specsRepo: string } {
  const args = process.argv.slice(2);
  let specsRepo = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--specs-repo") {
      specsRepo = args[++i];
    }
  }

  if (!specsRepo) {
    console.error("Usage: npm run compare:setup -- --specs-repo <path-to-azure-rest-api-specs>");
    process.exit(1);
  }

  return { specsRepo: path.resolve(specsRepo) };
}

function run(cmd: string, cwd: string, label: string): void {
  console.log(`   ${label}...`);
  try {
    execSync(cmd, { cwd, stdio: "pipe" });
  } catch (err: any) {
    console.error(`   ✗ ${label} failed`);
    console.error(`     ${(err.stderr?.toString() || err.message).slice(0, 200)}`);
    process.exit(1);
  }
  console.log(`   ✓ ${label}`);
}

function main() {
  const { specsRepo } = parseArgs();

  console.log("\n🔧 Cross-Repo Comparison Setup\n");

  // Step 1: Verify specs repo exists and has node_modules
  console.log("1. Verifying specs repo...");
  if (!fs.existsSync(path.join(specsRepo, "package.json"))) {
    console.error(`   ✗ No package.json found at ${specsRepo}`);
    process.exit(1);
  }
  if (!fs.existsSync(path.join(specsRepo, "node_modules"))) {
    console.error(`   ✗ node_modules not found. Run 'npm install' in ${specsRepo} first.`);
    process.exit(1);
  }
  const tspBin = path.join(specsRepo, "node_modules", ".bin", process.platform === "win32" ? "tsp.cmd" : "tsp");
  if (!fs.existsSync(tspBin)) {
    console.error(`   ✗ tsp CLI not found at ${tspBin}. Run 'npm install' in ${specsRepo}.`);
    process.exit(1);
  }
  console.log(`   ✓ Specs repo verified at ${specsRepo}`);

  // Step 2: Build the local linter
  console.log("\n2. Building local linter...");
  if (!fs.existsSync(path.join(LINTER_DIR, "package.json"))) {
    console.error(`   ✗ Linter package not found at ${LINTER_DIR}`);
    process.exit(1);
  }
  run("npm run build", LINTER_DIR, "tsc -p tsconfig.build.json");

  // Step 3: npm link the linter globally
  console.log("\n3. Linking linter globally...");
  run("npm link", LINTER_DIR, "npm link (global)");

  // Step 4: Link into specs repo
  console.log("\n4. Linking linter into specs repo...");
  run("npm link tsp-lintdiff-local-linter", specsRepo, "npm link tsp-lintdiff-local-linter");

  // Step 5: Verify the link works
  console.log("\n5. Verifying setup...");
  const linkedPath = path.join(specsRepo, "node_modules", "tsp-lintdiff-local-linter");
  if (!fs.existsSync(linkedPath)) {
    console.error(`   ✗ Link verification failed: ${linkedPath} does not exist`);
    process.exit(1);
  }

  // Verify the linked package has built output
  const distIndex = path.join(linkedPath, "dist", "src", "linter.js");
  if (!fs.existsSync(distIndex)) {
    console.error(`   ✗ Built output not found at ${distIndex}. Build may have failed.`);
    process.exit(1);
  }
  console.log("   ✓ Link verified and build output present");

  // Done
  console.log("\n✅ Setup complete! You can now run:");
  console.log(`\n   npm run compare -- --specs-repo "${specsRepo}" --type arm`);
  console.log(`   npm run compare -- --specs-repo "${specsRepo}" --type data-plane`);
  console.log(`   npm run compare -- --specs-repo "${specsRepo}" --limit 5\n`);
}

main();
