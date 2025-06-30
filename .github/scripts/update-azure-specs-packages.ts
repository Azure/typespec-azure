#!/usr/bin/env tsx

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, resolve, relative } from 'path';

interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: any;
}

const azureSpecsDir = process.argv[2];
const tgzDir = process.argv[3];

if (!azureSpecsDir || !tgzDir) {
  console.error('Usage: tsx update-azure-specs-packages.ts <azure-specs-dir> <tgz-dir>');
  process.exit(1);
}

const packageJsonPath = join(azureSpecsDir, 'package.json');

// Read existing package.json
const packageJson: PackageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

// Ensure dependencies object exists
packageJson.dependencies = packageJson.dependencies || {};

// Find all tgz files
const tgzFiles = readdirSync(tgzDir).filter(f => f.endsWith('.tgz'));

console.log('Found tgz files:', tgzFiles);

// Update dependencies to point to tgz files
for (const tgzFile of tgzFiles) {
  const fullPath = resolve(tgzDir, tgzFile);
  const relativePath = relative(azureSpecsDir, fullPath);
  
  // Extract package name from tgz filename
  // Format is typically: azure-tools-typespec-azure-core-1.0.0.tgz or typespec-compiler-1.1.0.tgz
  let packageName = '';
  if (tgzFile.startsWith('azure-tools-')) {
    // Extract name for azure packages: azure-tools-typespec-azure-core-1.0.0.tgz -> @azure-tools/typespec-azure-core
    const withoutPrefix = tgzFile.replace('azure-tools-', '');
    const withoutVersion = withoutPrefix.replace(/-\d+\.\d+\.\d+.*\.tgz$/, '');
    packageName = `@azure-tools/${withoutVersion}`;
  } else if (tgzFile.startsWith('typespec-compiler-')) {
    // Extract name for compiler: typespec-compiler-1.1.0.tgz -> @typespec/compiler
    packageName = '@typespec/compiler';
  } else if (tgzFile.startsWith('typespec-azure-vscode-')) {
    // Handle special case for vscode extension
    packageName = 'typespec-azure-vscode';
  }
  
  if (packageName) {
    packageJson.dependencies[packageName] = `file:${relativePath}`;
    console.log(`Added dependency: ${packageName} -> file:${relativePath}`);
  } else {
    console.warn(`Could not determine package name for: ${tgzFile}`);
  }
}

// Write updated package.json
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
console.log('Updated package.json successfully');