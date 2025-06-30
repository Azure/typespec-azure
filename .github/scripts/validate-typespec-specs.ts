#!/usr/bin/env tsx
/* eslint-disable no-console */

import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { spawn } from 'child_process';

async function findTspConfigDirectories(startDir: string): Promise<string[]> {
  const directories: string[] = [];
  
  async function searchDirectory(dir: string): Promise<void> {
    try {
      const entries = await readdir(dir);
      
      // Check if this directory has a tspconfig.yaml
      if (entries.includes('tspconfig.yaml')) {
        directories.push(dir);
        return; // Don't search subdirectories if we found a tspconfig.yaml
      }
      
      // Search subdirectories
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        try {
          const stats = await stat(fullPath);
          if (stats.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
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
    const process = spawn('npx', ['tsp', 'compile', '.'], {
      cwd: directory,
      stdio: 'pipe'
    });
    
    let output = '';
    
    process.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    process.on('close', (code) => {
      resolve({
        success: code === 0,
        output: output
      });
    });
  });
}

async function main() {
  const azureSpecsDir = process.argv[2];
  
  if (!azureSpecsDir) {
    console.error('Usage: tsx validate-typespec-specs.ts <azure-specs-dir>');
    process.exit(1);
  }
  
  console.log(`Looking for TypeSpec projects in ${azureSpecsDir}...`);
  
  const tspConfigDirs = await findTspConfigDirectories(join(azureSpecsDir, 'specification'));
  
  if (tspConfigDirs.length === 0) {
    console.log('No tspconfig.yaml files found in specification directory');
    return;
  }
  
  console.log(`Found ${tspConfigDirs.length} TypeSpec projects:`);
  tspConfigDirs.forEach(dir => console.log(`  - ${dir}`));
  console.log('');
  
  let successCount = 0;
  let failureCount = 0;
  const failedFolders: string[] = [];
  
  for (const dir of tspConfigDirs) {
    console.log(`\n=== Compiling TypeSpec project in ${dir} ===`);
    
    const result = await runTspCompile(dir);
    
    if (result.success) {
      console.log('✅ Compilation successful');
      successCount++;
    } else {
      console.log('❌ Compilation failed');
      failureCount++;
      failedFolders.push(dir);
    }
    
    if (result.output.trim()) {
      console.log('Output:');
      console.log(result.output);
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Total projects: ${tspConfigDirs.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failureCount}`);
  
  if (failureCount > 0) {
    console.log('\nFailed folders:');
    failedFolders.forEach(folder => console.log(`  - ${folder}`));
    console.log('\nNote: Some failures are expected during integration testing');
  }
}

main().catch(console.error);