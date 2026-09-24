import { readFileSync, realpathSync } from "node:fs";
import { lstat, mkdir, realpath, symlink } from "node:fs/promises";
import { findPackageJSON } from "node:module";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const AZURE_CSHARP = "@azure-typespec/http-client-csharp";
const BASE_CSHARP = "@typespec/http-client-csharp";

interface PackageManifest {
  name: string;
  version: string;
  peerDependencies?: Record<string, string>;
}

function packageFile(name: string, from: string): string {
  const file = findPackageJSON(name, pathToFileURL(join(from, "package.json")));
  if (!file) throw new Error(`Cannot resolve ${name} from ${from}`);
  return realpathSync(file);
}

export async function linkCSharpEmitter(benchmarkDir: string): Promise<void> {
  const target = join(benchmarkDir, ".emitters/node_modules", AZURE_CSHARP);
  const link = join(benchmarkDir, "node_modules", AZURE_CSHARP);
  await mkdir(dirname(link), { recursive: true });
  const existing = await lstat(link).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
    return undefined;
  });
  if (existing) {
    if (existing.isSymbolicLink() && (await realpath(link)) === (await realpath(target))) return;
    throw new Error(`${link} already exists and is not the benchmark's C# emitter link.`);
  }
  await symlink(target, link, "junction");
}

/** Ensure the npm emitter measures this checkout, not an auto-installed copy of its peers. */
export function inspectCSharpInstallation(benchmarkDir: string): Record<string, string> {
  const azureFile = packageFile(AZURE_CSHARP, benchmarkDir);
  const baseFile = packageFile(BASE_CSHARP, dirname(azureFile));
  const manifests = [azureFile, baseFile].map(
    (file) => JSON.parse(readFileSync(file, "utf8")) as PackageManifest,
  );
  const peers = new Set(manifests.flatMap((pkg) => Object.keys(pkg.peerDependencies ?? {})));
  for (const peer of peers) {
    if (!peer.startsWith("@typespec/") && !peer.startsWith("@azure-tools/")) continue;
    const [scope, name] = peer.split("/");
    const workspaceFile = realpathSync(
      resolve(
        benchmarkDir,
        "../..",
        scope === "@typespec" ? "core/packages" : "packages",
        name,
        "package.json",
      ),
    );
    for (const from of [benchmarkDir, dirname(azureFile), dirname(baseFile)]) {
      const resolved = packageFile(peer, from);
      if (resolved !== workspaceFile) {
        throw new Error(`${peer} resolves to ${resolved}, not workspace package ${workspaceFile}`);
      }
    }
  }
  return Object.fromEntries(manifests.map((pkg) => [pkg.name, pkg.version]));
}
