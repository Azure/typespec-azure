import { findWorkspacePackagesNoCheck } from "@pnpm/workspace.find-packages";
import { readdir } from "node:fs/promises";
import { relative, resolve } from "pathe";
import pc from "picocolors";
import { log } from "./utils.js";

export interface Packages {
  [key: string]: {
    name: string;
    path: string;
  };
}

export interface FindPackageOptions {
  wsDir?: string;
  tgzDir?: string;
}

export function findPackages(options: FindPackageOptions): Promise<Packages> {
  if (options.tgzDir) {
    return findPackagesFromTgzArtifactDir(options.tgzDir);
  }
  if (options.wsDir) {
    return findPackagesFromWorkspace(options.wsDir);
  } else {
    throw new Error("Either wsDir or tgzDir must be provided to findPackages");
  }
}

export function printPackages(packages: Packages): void {
  log("Found packages:");
  for (const [name, pkg] of Object.entries(packages)) {
    log(`  ${pc.green(name)}: ${pc.cyan(relative(process.cwd(), pkg.path))}`);
  }
}

export async function findPackagesFromTgzArtifactDir(tgzDir: string): Promise<Packages> {
  const packages: Packages = {};

  const items = await readdir(tgzDir, { withFileTypes: true });
  const tgzFiles = items.filter((x) => x.isFile() && x.name.endsWith(".tgz")).map((x) => x.name);

  // Update dependencies to point to tgz files
  for (const tgzFile of tgzFiles) {
    const fullPath = resolve(tgzDir, tgzFile);

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

    packages[packageName] = {
      name: packageName,
      path: fullPath,
    };
  }
  return packages;
}

export async function findPackagesFromWorkspace(root: string): Promise<Packages> {
  const pnpmPackages = await findWorkspacePackagesNoCheck(root);
  const packages: Packages = {};

  for (const pkg of pnpmPackages) {
    if (!pkg.manifest.name || pkg.manifest.private) continue;
    packages[pkg.manifest.name] = {
      name: pkg.manifest.name,
      path: pkg.rootDirRealPath,
    };
  }
  return packages;
}
