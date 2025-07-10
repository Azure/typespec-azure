#!/usr/bin/env tsx
/* eslint-disable no-console */

import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join, relative, resolve } from "path";

interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  overrides?: Record<string, string>;
  [key: string]: any;
}

const azureSpecsDir = process.argv[2];
const tgzDir = process.argv[3];

if (!azureSpecsDir || !tgzDir) {
  console.error("Usage: tsx update-azure-specs-packages.ts <azure-specs-dir> <tgz-dir>");
  process.exit(1);
}

const packageJsonPath = join(azureSpecsDir, "package.json");

// Read existing package.json
const packageJson: PackageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

// Ensure dependency objects exist
packageJson.dependencies = packageJson.dependencies || {};
packageJson.devDependencies = packageJson.devDependencies || {};
packageJson.peerDependencies = packageJson.peerDependencies || {};
packageJson.overrides = packageJson.overrides || {};

// Find all tgz files
const tgzFiles = readdirSync(tgzDir).filter((f) => f.endsWith(".tgz"));

console.log("Found tgz files:", tgzFiles);

// Update dependencies to point to tgz files
for (const tgzFile of tgzFiles) {
  const fullPath = resolve(tgzDir, tgzFile);
  const relativePath = relative(azureSpecsDir, fullPath);

  // Extract package name from tgz filename
  // Format is typically: azure-tools-typespec-azure-core-1.0.0.tgz or typespec-compiler-1.1.0.tgz
  let packageName = "";
  if (tgzFile.startsWith("azure-tools-")) {
    // Extract name for azure packages: azure-tools-typespec-azure-core-1.0.0.tgz -> @azure-tools/typespec-azure-core
    const withoutPrefix = tgzFile.replace("azure-tools-", "");
    const withoutVersion = withoutPrefix.replace(/-\d+\.\d+\.\d+.*\.tgz$/, "");
    packageName = `@azure-tools/${withoutVersion}`;
  } else if (tgzFile.startsWith("typespec-")) {
    // Extract name for @typespec packages: typespec-compiler-1.1.0.tgz -> @typespec/compiler, typespec-http-1.0.0.tgz -> @typespec/http
    const withoutPrefix = tgzFile.replace("typespec-", "");
    const withoutVersion = withoutPrefix.replace(/-\d+\.\d+\.\d+.*\.tgz$/, "");
    packageName = `@typespec/${withoutVersion}`;
  } else if (tgzFile.startsWith("typespec-azure-vscode-")) {
    // Handle special case for vscode extension
    packageName = "typespec-azure-vscode";
  }

  if (packageName) {
    const filePath = `file:${relativePath}`;

    // Replace in all dependency types if the package exists
    if (packageJson.dependencies?.[packageName]) {
      packageJson.dependencies[packageName] = filePath;
      console.log(`Updated dependency: ${packageName} -> ${filePath}`);
    }
    if (packageJson.devDependencies?.[packageName]) {
      packageJson.devDependencies[packageName] = filePath;
      console.log(`Updated devDependency: ${packageName} -> ${filePath}`);
    }
    if (packageJson.peerDependencies?.[packageName]) {
      packageJson.peerDependencies[packageName] = filePath;
      console.log(`Updated peerDependency: ${packageName} -> ${filePath}`);
    }

    // Also set in overrides to ensure all nested dependencies use our version
    packageJson.overrides[packageName] = filePath;
    console.log(`Set override: ${packageName} -> ${filePath}`);
  } else {
    console.warn(`Could not determine package name for: ${tgzFile}`);
  }
}

// Write updated package.json
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
console.log("Updated package.json successfully");
