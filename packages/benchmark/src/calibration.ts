/* eslint-disable no-console */
/**
 * Machine calibration.
 *
 * Every benchmark point is measured on whatever runner CI happens to hand out,
 * and those runners are not equally fast. Measured across 100 commits, the same
 * code varied by 63% depending on the machine: between-machine spread was 13.7%
 * against 0.9% within a machine, so hardware outweighed code changes 16 to 1.
 *
 * This module measures the denominator needed to divide that out: a reference
 * workload that never changes, compiled on the same machine, in the same job,
 * as the real benchmark.
 *
 * Two properties matter, and they pull in opposite directions.
 *
 * The reference must be **frozen**. It deliberately does not use the packages
 * being benchmarked -- it installs pinned releases from npm -- because a
 * reference that moved with the repo would slow down alongside a real
 * regression and cancel it out.
 *
 * The reference must also be **representative**. A first attempt used a
 * synthetic spec importing only the compiler; between two CI machines it slowed
 * 16% while the real specs slowed 34%, so it removed only half the machine
 * effect. Hardware sensitivity varies with the kind of work: `loader` is a
 * third of the real measurement and was the most sensitive phase of all, and a
 * spec with no libraries to load barely exercises it. The reference is
 * therefore a frozen copy of the azure-full benchmark spec, compiled against
 * the same pinned library stack and the same linter ruleset, so that it does
 * the same mix of work.
 */
import { execFile, execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { median, summarize } from "./statistics.js";
import type { CalibrationInfo } from "./types.js";

/**
 * Identifies the frozen workload. Bump whenever the reference spec or any
 * pinned version in calibration/package.json changes, so that points measured
 * against different yardsticks are never compared with each other.
 *
 * v1: synthetic compiler-only spec. Withdrawn, it under-corrected by half.
 * v2: frozen copy of the azure-full spec against the pinned library stack.
 */
const WORKLOAD_ID = "v2";

/** Reported alongside results so the reference in use is always identifiable. */
const REFERENCE_COMPILER_VERSION = "1.15.0";

/**
 * Sized so the machine-speed estimate is far more precise than the regressions
 * it needs to expose, without adding meaningfully to a ~25 minute job.
 */
const CALIBRATION_WARMUP = 3;
const CALIBRATION_ITERATIONS = 25;

/** The frozen workload, shipped in the package rather than generated. */
const sourceDir = join(dirname(fileURLToPath(import.meta.url)), "../../calibration");

/**
 * Loader executed from inside the calibration directory so that bare imports
 * resolve to the pinned copies through normal Node resolution rather than to
 * the workspace being benchmarked.
 *
 * Measures what `total` measures for real specs: every phase except emit.
 */
const REFERENCE_RUNNER = `
import { compile, NodeHost, resolveCompilerOptions } from "@typespec/compiler";
import { join } from "node:path";

const specDir = process.argv[2];
const mainFile = join(specDir, "main.tsp");
const [options] = await resolveCompilerOptions(NodeHost, { entrypoint: mainFile, cwd: specDir });
const program = await compile(NodeHost, mainFile, {
  ...options,
  outputDir: join(specDir, "tsp-output"),
  noEmit: true,
});
if (program.hasError()) {
  const errors = program.diagnostics
    .filter((d) => d.severity === "error")
    .map((d) => "  " + d.message)
    .join("\\n");
  throw new Error("Calibration spec failed to compile:\\n" + errors);
}
const runtime = program.stats.runtime;
const total =
  (runtime.loader ?? 0) +
  (runtime.resolver ?? 0) +
  (runtime.checker ?? 0) +
  (runtime.validation?.total ?? 0) +
  (runtime.linter?.total ?? 0);
process.stdout.write(JSON.stringify({ total }));
`;

/** Where the frozen environment is materialized. Reused across commits in a backfill job. */
function calibrationDir(): string {
  return join(tmpdir(), `typespec-benchmark-calibration-${WORKLOAD_ID}`);
}

/**
 * Materialize the pinned stack and frozen spec. Installs only when missing, so
 * a backfill measuring many commits pays for it once.
 */
function prepare(dir: string): void {
  const marker = join(
    dir,
    "node_modules",
    "@azure-tools",
    "typespec-azure-rulesets",
    "package.json",
  );

  mkdirSync(dir, { recursive: true });
  cpSync(sourceDir, dir, { recursive: true });
  writeFileSync(join(dir, "run.mjs"), REFERENCE_RUNNER);

  if (existsSync(marker)) return;

  try {
    execFileSync(
      "npm",
      ["install", "--no-package-lock", "--no-audit", "--no-fund", "--loglevel", "error"],
      { cwd: dir, stdio: ["ignore", "ignore", "pipe"], encoding: "utf-8" },
    );
  } catch (error: any) {
    const details = String(error?.stderr ?? "").trim();
    throw new Error(
      `failed to install the reference stack${details ? `: ${details.split("\n")[0]}` : ""}`,
      { cause: error },
    );
  }
}

async function compileReference(dir: string): Promise<number> {
  return await new Promise<number>((resolvePromise, reject) => {
    execFile(
      process.execPath,
      [join(dir, "run.mjs"), join(dir, "spec")],
      { cwd: dir },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr.trim() || error.message));
          return;
        }
        try {
          resolvePromise((JSON.parse(stdout) as { total: number }).total);
        } catch {
          reject(new Error(`unexpected calibration output: ${stdout.slice(0, 200)}`));
        }
      },
    );
  });
}

/**
 * Measure this machine against the frozen reference.
 *
 * Returns undefined rather than throwing: a machine-speed estimate is valuable
 * but not worth losing a 25 minute benchmark run over, and consumers already
 * treat calibration as optional so that points measured before it existed stay
 * readable.
 */
export async function measureCalibration(): Promise<CalibrationInfo | undefined> {
  const dir = calibrationDir();
  try {
    prepare(dir);

    for (let i = 0; i < CALIBRATION_WARMUP; i++) {
      await compileReference(dir);
    }

    const samples: number[] = [];
    for (let i = 0; i < CALIBRATION_ITERATIONS; i++) {
      samples.push(await compileReference(dir));
    }

    const stats = summarize(samples);
    return {
      compilerVersion: REFERENCE_COMPILER_VERSION,
      workload: WORKLOAD_ID,
      total: median(samples),
      iterations: samples.length,
      cv: stats.cv,
    };
  } catch (error) {
    console.log(
      `  Calibration unavailable (${error instanceof Error ? error.message.split("\n")[0] : error}); ` +
        `results will not be machine-normalized.`,
    );
    return undefined;
  }
}
