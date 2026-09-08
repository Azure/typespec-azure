/* eslint-disable no-console */
/**
 * Machine calibration.
 *
 * Every benchmark point is measured on whatever runner CI happens to hand out,
 * and those runners are not equally fast. Measured across 100 commits, the same
 * code varied by 63% depending on the machine: between-machine spread was 13.7%
 * against 0.9% within a machine, so hardware outweighed code changes 16 to 1.
 *
 * Machine speed acts as a multiplicative constant, which is why dividing one
 * TypeSpec workload by another collapsed that 13.7% to 0.7%. This module
 * measures the denominator: a reference workload that never changes, compiled
 * on the same machine, in the same job, as the real benchmark.
 *
 * The reference must stay frozen. It deliberately does not use the compiler
 * being benchmarked -- it installs a pinned release from npm -- because a
 * reference that moved with the repo would cancel out the very regressions this
 * is meant to expose. Everything it needs is materialized from the constants
 * below, so it is identical for every commit ever measured, including commits
 * predating this file.
 */
import { execFile, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { median, summarize } from "./statistics.js";
import type { CalibrationInfo } from "./types.js";

/**
 * Pinned reference compiler. Changing this invalidates comparability with every
 * point measured before the change, so it should move rarely and deliberately,
 * together with WORKLOAD_ID.
 */
const REFERENCE_COMPILER_VERSION = "1.14.0";

/**
 * Identifies the frozen workload. Bump whenever REFERENCE_SPEC or the pinned
 * compiler changes, so old points are never silently compared against a
 * different yardstick.
 */
const WORKLOAD_ID = "v1";

/**
 * Sized so the machine-speed estimate is far more precise than the regressions
 * it needs to expose: measured across-run spread is ~0.5%, against a ~3.5%
 * detection target, for ~15s of job time.
 */
const CALIBRATION_WARMUP = 5;
const CALIBRATION_ITERATIONS = 25;

/** Size of the frozen workload. Tuned so the reference takes long enough to average out scheduler noise. */
const ENTITY_COUNT = 400;
const FIELDS_PER_ENTITY = 20;
const OPERATION_COUNT = 200;

/**
 * The frozen workload. Uses only compiler built-ins so calibration needs a
 * single pinned package, and is sized to run long enough to average out
 * scheduler noise without materially adding to job time.
 */
const REFERENCE_SPEC = `
import "@typespec/compiler";

@service(#{ title: "Calibration" })
namespace Calibration;

model Base {
  id: string;
  createdAt: utcDateTime;
  updatedAt: utcDateTime;
  tags: string[];
}

model Item<T> is Base {
  value: T;
  nested: Record<T>;
  maybe?: T | null;
}

union Status {
  active: "active",
  inactive: "inactive",
  pending: "pending",
}

${Array.from({ length: ENTITY_COUNT }, (_, i) => {
  const props = Array.from(
    { length: FIELDS_PER_ENTITY },
    (_, p) => `  field${p}: string | int32 | boolean;`,
  ).join("\n");
  return `model Entity${i} is Item<string> {
${props}
  status: Status;
  peer?: Entity${(i + 1) % ENTITY_COUNT};
}`;
}).join("\n\n")}

${Array.from(
  { length: OPERATION_COUNT },
  (_, i) =>
    `op operation${i}(input: Entity${i % ENTITY_COUNT}, status: Status): Entity${(i + 7) % ENTITY_COUNT};`,
).join("\n")}
`;

/**
 * Loader executed inside the calibration directory so that a bare
 * "@typespec/compiler" import resolves to the pinned copy through normal Node
 * resolution rather than to the workspace being benchmarked.
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
  return join(
    tmpdir(),
    `typespec-benchmark-calibration-${REFERENCE_COMPILER_VERSION}-${WORKLOAD_ID}`,
  );
}

/**
 * Materialize the pinned compiler and frozen spec. Installs only when missing,
 * so a backfill measuring many commits pays for it once.
 */
function prepare(dir: string): void {
  const specDir = join(dir, "spec");
  const marker = join(dir, "node_modules", "@typespec", "compiler", "package.json");

  mkdirSync(specDir, { recursive: true });
  writeFileSync(join(specDir, "main.tsp"), REFERENCE_SPEC);
  writeFileSync(join(specDir, "tspconfig.yaml"), "emit: []\n");
  writeFileSync(join(dir, "run.mjs"), REFERENCE_RUNNER);
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify(
      { name: "typespec-benchmark-calibration", private: true, type: "module" },
      null,
      2,
    ),
  );

  if (existsSync(marker)) return;

  try {
    execFileSync(
      "npm",
      [
        "install",
        `@typespec/compiler@${REFERENCE_COMPILER_VERSION}`,
        "--no-package-lock",
        "--no-audit",
        "--no-fund",
        "--prefer-offline",
        "--loglevel",
        "error",
      ],
      { cwd: dir, stdio: ["ignore", "ignore", "pipe"], encoding: "utf-8" },
    );
  } catch (error: any) {
    const details = String(error?.stderr ?? "").trim();
    throw new Error(
      `failed to install the reference compiler${details ? `: ${details.split("\n")[0]}` : ""}`,
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
 * but not worth losing a 20 minute benchmark run over, and consumers already
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
