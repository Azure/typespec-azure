import { findWorkspacePackagesNoCheck } from "@pnpm/workspace.find-packages";
import { readdir } from "node:fs/promises";
import { relative, resolve } from "pathe";
import pc from "picocolors";
import { log } from "./utils.js";

/**
 * Collection of packages indexed by package name.
 */
export interface Packages {
  [key: string]: {
    /** The package name (e.g., "@typespec/compiler") */
    name: string;
    /** Absolute path to the package directory or .tgz file */
    path: string;
  };
}

/**
 * Options for {@link findPackages}
 */
export interface FindPackageOptions {
  /** Directory containing PNPM workspace to scan for packages */
  wsDir?: string;
  /** Directory containing .tgz artifact files */
  tgzDir?: string;
}

/**
 * Finds packages from either a workspace directory or tgz artifact directory.
 *
 * @param options - Configuration specifying the source to find packages from
 * @returns Promise resolving to a collection of discovered packages
 * @throws Error if neither wsDir nor tgzDir is provided
 */
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

/**
 * Prints a formatted list of discovered packages to the console.
 *
 * @param packages - Collection of packages to display
 */
export function printPackages(packages: Packages): void {
  log("Found packages:");
  for (const [name, pkg] of Object.entries(packages)) {
    log(`  ${pc.green(name)}: ${pc.cyan(relative(process.cwd(), pkg.path))}`);
  }
}

/**
 * Discovers packages from a directory containing .tgz artifact files.
 *
 * This function scans a directory for .tgz files and extracts package information
 * from their filenames. It handles the naming conventions used by different package
 * families (@azure-tools/*, @typespec/*, etc.).
 *
 * @param tgzDir - Directory containing .tgz artifact files
 * @returns Promise resolving to discovered packages with paths pointing to .tgz files
 */
export async function findPackagesFromTgzArtifactDir(tgzDir: string): Promise<Packages> {
  const packages: Packages = {};

  const items = await readdir(tgzDir, { withFileTypes: true });
  const tgzFiles = items
    .filter((item) => item.isFile() && item.name.endsWith(".tgz"))
    .map((item) => item.name);

  for (const tgzFile of tgzFiles) {
    const fullPath = resolve(tgzDir, tgzFile);
    const packageName = extractPackageNameFromTgzFilename(tgzFile);

    if (packageName) {
      packages[packageName] = {
        name: packageName,
        path: fullPath,
      };
    }
  }

  return packages;
}

/**
 * Extracts the package name from a .tgz filename based on naming conventions.
 *
 * Handles various package naming patterns:
 * - azure-tools-typespec-azure-core-1.0.0.tgz -> @azure-tools/typespec-azure-core
 * - typespec-compiler-1.1.0.tgz -> @typespec/compiler
 * - typespec-azure-vscode-1.0.0.tgz -> typespec-azure-vscode
 *
 * @param tgzFile - The .tgz filename to extract package name from
 * @returns The extracted package name, or empty string if pattern doesn't match
 */
function extractPackageNameFromTgzFilename(tgzFile: string): string {
  // Remove version suffix (pattern: -X.Y.Z[additional].tgz)
  const versionPattern = /-\d+\.\d+\.\d+.*\.tgz$/;

  if (tgzFile.startsWith("azure-tools-")) {
    // Extract name for azure packages: azure-tools-typespec-azure-core-1.0.0.tgz -> @azure-tools/typespec-azure-core
    const withoutPrefix = tgzFile.replace("azure-tools-", "");
    const withoutVersion = withoutPrefix.replace(versionPattern, "");
    return `@azure-tools/${withoutVersion}`;
  } else if (tgzFile.startsWith("typespec-") && !tgzFile.startsWith("typespec-azure-vscode-")) {
    // Extract name for @typespec packages: typespec-compiler-1.1.0.tgz -> @typespec/compiler
    const withoutPrefix = tgzFile.replace("typespec-", "");
    const withoutVersion = withoutPrefix.replace(versionPattern, "");
    return `@typespec/${withoutVersion}`;
  } else if (tgzFile.startsWith("typespec-azure-vscode-")) {
    // Handle special case for vscode extension
    return "typespec-azure-vscode";
  }

  throw new Error(`Unknown .tgz filename format: ${tgzFile}`);
}

/**
 * Discovers packages from a PNPM workspace configuration.
 *
 * This function uses PNPM's workspace discovery to find all packages in a monorepo.
 * It filters out private packages and packages without names.
 *
 * @param root - Root directory of the PNPM workspace
 * @returns Promise resolving to discovered packages with paths pointing to package directories
 */
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
