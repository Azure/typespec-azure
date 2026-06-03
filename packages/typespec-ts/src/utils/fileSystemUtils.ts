import { mkdir, readdir, rm, stat } from "fs/promises";
import { resolve } from "path";
import { NoTarget, Program } from "@typespec/compiler";
import { reportDiagnostic } from "../lib.js";

export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function emptyDir(dirPath: string): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(dirPath);
  } catch {
    await mkdir(dirPath, { recursive: true });
    return;
  }

  await Promise.all(
    entries.map((entry) =>
      rm(resolve(dirPath, entry), { recursive: true, force: true })
    )
  );
}

export async function clearDirectory(
  dirPath: string,
  excludeNames: string[] = [],
  program?: Program
): Promise<void> {
  if (!(await pathExists(dirPath))) {
    return;
  }

  // If no exclude names, just use regular emptyDir for efficiency
  if (excludeNames.length === 0) {
    await emptyDir(dirPath);
    return;
  }

  try {
    // Get all subdirectories and files
    const entries = await readdir(dirPath);

    // Filter entries to exclude those that should be preserved
    const filteredEntries = entries.filter((entry) => {
      return !excludeNames.includes(entry);
    });

    // Process each entry
    for (const entry of filteredEntries) {
      const entryPath = resolve(dirPath, entry);
      await rm(entryPath, { recursive: true, force: true });
    }
  } catch (error) {
    // If there's an error, fall back to regular emptyDir
    if (program) {
      reportDiagnostic(program, {
        code: "directory-traversal-error",
        format: { directory: dirPath, error: String(error) },
        target: NoTarget
      });
    }
    await emptyDir(dirPath);
  }
}
