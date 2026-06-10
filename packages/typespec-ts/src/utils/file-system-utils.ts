import { CompilerHost, NoTarget, Program, resolvePath } from "@typespec/compiler";
import { reportDiagnostic } from "../lib.js";

export async function pathExists(host: CompilerHost, targetPath: string): Promise<boolean> {
  try {
    await host.stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function emptyDir(host: CompilerHost, dirPath: string): Promise<void> {
  let entries: string[];
  try {
    entries = await host.readDir(dirPath);
  } catch {
    await host.mkdirp(dirPath);
    return;
  }

  await Promise.all(
    entries.map((entry) => host.rm(resolvePath(dirPath, entry), { recursive: true })),
  );
}

export async function clearDirectory(
  host: CompilerHost,
  dirPath: string,
  excludeNames: string[] = [],
  program?: Program,
): Promise<void> {
  if (!(await pathExists(host, dirPath))) {
    return;
  }

  if (excludeNames.length === 0) {
    await emptyDir(host, dirPath);
    return;
  }

  try {
    const entries = await host.readDir(dirPath);
    const filteredEntries = entries.filter((entry) => {
      return !excludeNames.includes(entry);
    });

    for (const entry of filteredEntries) {
      const entryPath = resolvePath(dirPath, entry);
      await host.rm(entryPath, { recursive: true });
    }
  } catch (error) {
    if (program) {
      reportDiagnostic(program, {
        code: "directory-traversal-error",
        format: { directory: dirPath, error: String(error) },
        target: NoTarget,
      });
    }
    await emptyDir(host, dirPath);
  }
}
