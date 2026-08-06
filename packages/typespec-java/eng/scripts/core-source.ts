/* eslint-disable no-console */
import { execa } from "execa";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extract } from "tar";

const coreJavaSubtree = "packages/http-client-java";
const gitEnvironment = { GIT_TERMINAL_PROMPT: "0" };

export interface CoreSource {
  root: string;
  tempDir?: string;
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

async function commitExists(coreRoot: string, sha: string): Promise<boolean> {
  const result = await execa("git", ["-C", coreRoot, "cat-file", "-e", `${sha}^{commit}`], {
    env: gitEnvironment,
    reject: false,
    stderr: "ignore",
  });
  return result.exitCode === 0;
}

export async function getCoreSourceRoot(
  coreRoot: string,
  packageRoot: string,
): Promise<CoreSource> {
  const originSha = (
    await execa("git", ["-C", coreRoot, "rev-parse", "HEAD"], { env: gitEnvironment })
  ).stdout.trim();
  const liveRoot = join(coreRoot, coreJavaSubtree);
  const configPath = join(packageRoot, "core-commit.json");

  let targetSha: string;
  try {
    targetSha = JSON.parse(await readFile(configPath, "utf8")).sha?.trim();
  } catch (error) {
    if (isErrnoException(error) && error.code === "ENOENT") {
      console.log(`core-commit.json not found; using current core checkout ${originSha}.`);
      return { root: liveRoot };
    }
    throw error;
  }

  if (!targetSha) {
    throw new Error(`No 'sha' found in ${configPath}.`);
  }
  if (targetSha === originSha) {
    return { root: liveRoot };
  }

  if (!(await commitExists(coreRoot, targetSha))) {
    await execa("git", ["-C", coreRoot, "fetch", "--quiet", "origin", targetSha], {
      env: gitEnvironment,
    });
    if (!(await commitExists(coreRoot, targetSha))) {
      throw new Error(
        `core-commit.json pins commit ${targetSha} but it could not be found or fetched in the 'core' submodule at ${coreRoot}.`,
      );
    }
  }

  console.log(
    `Reading core sources from pinned commit ${targetSha} (submodule at ${originSha}) without checking it out`,
  );
  const tempDir = await mkdtemp(join(tmpdir(), "typespec-java-core-"));
  const archivePath = join(tempDir, "core.tar");
  const extractDir = join(tempDir, "src");
  try {
    await mkdir(extractDir);
    await execa("git", [
      "-C",
      coreRoot,
      "archive",
      "--format=tar",
      "-o",
      archivePath,
      `${targetSha}:${coreJavaSubtree}`,
    ]);
    await extract({ cwd: extractDir, file: archivePath });
    await rm(archivePath);
    return { root: extractDir, tempDir };
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true });
    throw error;
  }
}

export async function removeCoreSourceRoot(coreSource: CoreSource): Promise<void> {
  if (coreSource.tempDir) {
    await rm(coreSource.tempDir, { recursive: true, force: true });
  }
}
