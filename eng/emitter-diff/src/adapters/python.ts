/**
 * typespec-python adapter.
 *
 * This is the only python-aware code in the tool. It satisfies the generic
 * {@link EmitterAdapter} contract by wrapping the python package's own scripts:
 *  - generation → `eng/scripts/regenerate.ts` (driven with `--emitter-dir` +
 *    `--output-dir` overrides so any emitter build can target any output dir).
 *  - test suites → `eng/scripts/ci/run-tests.ts` (pytest/lint/mypy/pyright...).
 *
 * The regenerate *driver* always comes from the current checkout; only the
 * `--emitter-dir` it points at changes between baseline and head. That isolates
 * the diff to emitter behavior rather than driver/spec-mapping differences.
 */
import { cpSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

import type {
  AdapterContext,
  ClassifiedRef,
  EmitterAdapter,
  GenerateRequest,
  ResolvedEmitter,
  RunTestsRequest,
} from "../types.ts";
import { describeRef } from "../resolver.ts";
import { run, runChecked } from "../util.ts";

const PACKAGE_NAME = "@azure-tools/typespec-python";
const PKG_REL = "packages/typespec-python";

function pkgDir(ctx: AdapterContext): string {
  return join(ctx.repoRoot, PKG_REL);
}

/** Resolve `tsx` from the python package and run a script in its directory. */
async function runScript(
  ctx: AdapterContext,
  scriptRelPath: string,
  args: string[],
  inherit = true,
): Promise<void> {
  const cwd = pkgDir(ctx);
  await runChecked("npx", ["tsx", join(cwd, scriptRelPath), ...args], { cwd, inherit });
}

async function isBuilt(dir: string): Promise<boolean> {
  return existsSync(join(dir, "dist", "src", "index.js"));
}

async function ensureBuilt(dir: string, ctx: AdapterContext): Promise<void> {
  if (await isBuilt(dir)) return;
  ctx.log.warn(`Emitter at ${dir} is not built; attempting build...`);
  // Best-effort build. Building an arbitrary source checkout fully may require a
  // workspace install; surface a clear error if it fails.
  const res = await run("pnpm", ["build"], { cwd: dir, inherit: true });
  if (res.code !== 0 || !(await isBuilt(dir))) {
    throw new Error(
      `Could not build emitter at ${dir}. Build it manually (pnpm install && pnpm build) and retry.`,
    );
  }
}

export const pythonAdapter: EmitterAdapter = {
  name: "python",
  packageName: PACKAGE_NAME,

  async prepareEmitter(
    ref: ClassifiedRef | "current",
    ctx: AdapterContext,
  ): Promise<ResolvedEmitter> {
    if (ref === "current") {
      const dir = pkgDir(ctx);
      await ensureBuilt(dir, ctx);
      return { dir, label: "current checkout" };
    }

    if (ref.kind === "npm") {
      // npm versions ship a prebuilt dist (+ python generator), no build needed.
      const dir = await ctx.installNpmPackage(PACKAGE_NAME, ref.version ?? "latest");
      return { dir, label: describeRef(ref, PACKAGE_NAME) };
    }

    // local / github: resolve to a source dir, then ensure it is built.
    const sourceRoot = await ctx.resolveSource(ref, PACKAGE_NAME);
    // For a full-repo source (github clone or repo root), the emitter lives in
    // packages/typespec-python; otherwise the resolved dir is the package itself.
    const candidate = existsSync(join(sourceRoot, PKG_REL))
      ? join(sourceRoot, PKG_REL)
      : sourceRoot;
    await ensureBuilt(candidate, ctx);
    return { dir: candidate, label: describeRef(ref, PACKAGE_NAME) };
  },

  async generate(request: GenerateRequest, ctx: AdapterContext): Promise<void> {
    const args = [
      "--emitter-dir",
      request.emitter.dir,
      "--output-dir",
      request.outputDir,
    ];

    const flavor = request.options.flavor;
    if (flavor) args.push("--flavor", flavor);
    if (request.nameFilter) args.push("--name", request.nameFilter);

    if (request.specsDir) {
      // External specs must mirror the http-specs / azure-http-specs layout.
      const httpSpecs = firstExisting([
        join(request.specsDir, "http-specs", "specs"),
        join(request.specsDir, "specs"),
        request.specsDir,
      ]);
      const azureSpecs = firstExisting([
        join(request.specsDir, "azure-http-specs", "specs"),
        join(request.specsDir, "azure", "specs"),
      ]);
      if (httpSpecs) args.push("--http-specs-dir", httpSpecs);
      if (azureSpecs) args.push("--azure-specs-dir", azureSpecs);
    }

    args.push(...request.passthrough);

    ctx.log.step(`Generating with ${request.emitter.label} → ${request.outputDir}`);
    await runScript(ctx, "eng/scripts/regenerate.ts", args);
  },

  async runTests(request: RunTestsRequest, ctx: AdapterContext): Promise<void> {
    // The python test harness is wired to <package>/tests/generated. Sync the
    // output tree there, then run the existing runner unchanged.
    const generatedRoot = join(pkgDir(ctx), "tests", "generated");
    ctx.log.step(`Syncing output into ${generatedRoot} for test run`);
    rmSync(generatedRoot, { recursive: true, force: true });
    cpSync(request.outputDir, generatedRoot, { recursive: true });

    const args: string[] = [];
    if (request.envs && request.envs.length > 0) {
      args.push("--env", request.envs.join(","));
    }
    const flavor = request.options.flavor;
    if (flavor) args.push("--flavor", flavor);
    if (request.nameFilter) args.push("--name", request.nameFilter);
    args.push(...request.passthrough);

    ctx.log.step("Running python test suites");
    await runScript(ctx, "eng/scripts/ci/run-tests.ts", args);
  },
};

function firstExisting(paths: string[]): string | undefined {
  return paths.find((p) => existsSync(p));
}
