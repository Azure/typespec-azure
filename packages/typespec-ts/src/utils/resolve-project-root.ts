import { CompilerHost, getDirectoryPath, resolvePath } from "@typespec/compiler";

/**
 * Recursively finds the nearest package.json file starting from the specified directory.
 * @param {string} currentDir - The directory to start searching from. Defaults to the directory of the current module.
 * @returns {string} path to the directory containing the package.json file.
 */
export async function resolveProjectRoot(host: CompilerHost, currentDir?: string): Promise<string> {
  if (!currentDir) {
    currentDir = getDirectoryPath(host.fileURLToPath(import.meta.url));
  }
  const packageJsonPath = resolvePath(currentDir, "package.json");

  try {
    await host.stat(packageJsonPath);
    return currentDir;
  } catch {
    // file doesn't exist, keep searching
  }

  const parentDir = resolvePath(currentDir, "..");

  if (parentDir === currentDir) {
    throw new Error("Could not find package.json");
  }

  return resolveProjectRoot(host, parentDir);
}
