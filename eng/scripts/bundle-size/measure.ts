// Measure the published npm package (tarball) size of every publishable package owned by
// this repo (the `core/` submodule is excluded, it publishes from `microsoft/typespec`).
// For each package we run `npm pack --dry-run --json` inside the package directory and
// record the packed (gzipped) size and the unpacked size.
//
// Usage:
//   tsx eng/scripts/bundle-size/measure.ts --out <file.json>
//
// Output is a JSON map: { [packageName]: { version, size, unpackedSize } }

import { execFileSync } from "child_process";
import { mkdir, writeFile } from "fs/promises";
import { dirname } from "path";
import { isRepoPackage, listPackages } from "./utils.ts";

export interface PackageSize {
  version: string;
  /** Packed (gzipped) tarball size in bytes. */
  size: number;
  /** Total unpacked size in bytes. */
  unpackedSize: number;
}

export type SizeReport = Record<string, PackageSize>;

interface NpmPackResult {
  name: string;
  version: string;
  size: number;
  unpackedSize: number;
}

function measurePackage(dir: string): NpmPackResult | undefined {
  // `--ignore-scripts` avoids prepack/prepare scripts rebuilding and printing to
  // stdout (which would corrupt the JSON). The workspace is expected to be built
  // before measuring, so `dist/**` already exists.
  const stdout = execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
    cwd: dir,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"],
    // npm on Windows resolves to npm.cmd; shell:true lets it be found.
    shell: process.platform === "win32",
  });
  // Be defensive: extract the JSON array even if a script leaked extra output.
  const start = stdout.indexOf("[");
  const end = stdout.lastIndexOf("]");
  if (start === -1 || end === -1) {
    throw new Error(`Could not find JSON output in \`npm pack\` result`);
  }
  const parsed = JSON.parse(stdout.slice(start, end + 1)) as NpmPackResult[];
  return parsed[0];
}

export async function measureAllPackages(): Promise<SizeReport> {
  const packages = listPackages();
  const report: SizeReport = {};

  for (const pkg of packages) {
    const name = pkg.name;
    // Skip unnamed or private (non-publishable) packages, and everything from the `core/`
    // submodule, which is published from `microsoft/typespec` rather than from this repo.
    if (!name || pkg.private || !isRepoPackage(pkg)) {
      continue;
    }
    try {
      const result = measurePackage(pkg.path);
      if (result) {
        report[name] = {
          version: result.version,
          size: result.size,
          unpackedSize: result.unpackedSize,
        };
      }
    } catch (e) {
      // A package that cannot be packed (e.g. not built) should not fail the whole
      // report; record nothing and continue.
      // eslint-disable-next-line no-console
      console.warn(`Skipped ${name}: failed to run \`npm pack\` (${(e as Error).message})`);
    }
  }

  return report;
}

function parseArgs(argv: string[]): { out: string } {
  const outIndex = argv.indexOf("--out");
  if (outIndex === -1 || !argv[outIndex + 1]) {
    throw new Error("Missing required argument: --out <file.json>");
  }
  return { out: argv[outIndex + 1] };
}

async function main() {
  const { out } = parseArgs(process.argv.slice(2));
  const report = await measureAllPackages();
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify(report, null, 2));
  // eslint-disable-next-line no-console
  console.log(`Wrote size report for ${Object.keys(report).length} package(s) to ${out}`);
}

await main();
