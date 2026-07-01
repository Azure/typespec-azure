/**
 * typespec-ts adapter.
 *
 * The only typescript-aware code in the tool. It satisfies the generic
 * {@link EmitterAdapter} contract by wrapping the package's own generation
 * driver `test/commands/gen-spector.js`, driven with `--emitter-dir` (the
 * emitter build to run) and `--output-dir` (an isolated output root) so any
 * emitter build can target any output dir.
 *
 * The driver always comes from the current checkout; only the `--emitter-dir`
 * it points at changes between baseline and head. Specs are staged from the
 * current checkout (`copy:typespec`) so the diff isolates emitter behavior
 * rather than driver/spec differences.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

import { describeRef } from "../resolver.ts";
import type {
  AdapterContext,
  ClassifiedRef,
  EmitterAdapter,
  GenerateRequest,
  ResolvedEmitter,
} from "../types.ts";
import { run, runChecked } from "../util.ts";

const PACKAGE_NAME = "@azure-tools/typespec-ts";
const PKG_REL = "packages/typespec-ts";

function pkgDir(ctx: AdapterContext): string {
  return join(ctx.repoRoot, PKG_REL);
}

async function isBuilt(dir: string): Promise<boolean> {
  return existsSync(join(dir, "dist", "src", "index.js"));
}

async function ensureBuilt(dir: string, ctx: AdapterContext): Promise<void> {
  if (await isBuilt(dir)) return;
  ctx.log.warn(`Emitter at ${dir} is not built; attempting build...`);
  const res = await run("pnpm", ["build"], { cwd: dir, inherit: true });
  if (res.code !== 0 || !(await isBuilt(dir))) {
    throw new Error(
      `Could not build emitter at ${dir}. Build it manually (pnpm install && pnpm build) and retry.`,
    );
  }
}

// The specs the driver reads live in <pkg>/temp/specs, staged by copy:typespec
// from the current checkout. Both baseline and head read the same staged specs,
// so stage exactly once (generate runs concurrently by default) — this memoized
// promise dedupes concurrent callers and avoids racing on temp/specs.
let specsStaged: Promise<void> | undefined;
function ensureSpecsStaged(ctx: AdapterContext): Promise<void> {
  specsStaged ??= (async () => {
    ctx.log.step("Staging specs (copy:typespec)");
    await runChecked("node", [join(pkgDir(ctx), "test", "commands", "copy-typespec.ts")], {
      cwd: pkgDir(ctx),
    });
  })();
  return specsStaged;
}

export const typescriptAdapter: EmitterAdapter = {
  name: "typescript",
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
      // npm versions ship a prebuilt dist, no build needed.
      const dir = await ctx.installNpmPackage(PACKAGE_NAME, ref.version ?? "latest");
      return { dir, label: describeRef(ref, PACKAGE_NAME) };
    }

    // local / github: resolve to a source dir, then ensure it is built.
    const sourceRoot = await ctx.resolveSource(ref, PACKAGE_NAME);
    // For a full-repo source (github clone or repo root), the emitter lives in
    // packages/typespec-ts; otherwise the resolved dir is the package itself.
    const candidate = existsSync(join(sourceRoot, PKG_REL))
      ? join(sourceRoot, PKG_REL)
      : sourceRoot;
    await ensureBuilt(candidate, ctx);
    return { dir: candidate, label: describeRef(ref, PACKAGE_NAME) };
  },

  async generate(request: GenerateRequest, ctx: AdapterContext): Promise<void> {
    await ensureSpecsStaged(ctx);

    // Only the client phase emits the generated sources the diff compares; the
    // declarations phase (tsc + api-extractor) is a separate baseline concern.
    const args = [
      join(pkgDir(ctx), "test", "commands", "gen-spector.js"),
      `--emitter-dir=${request.emitter.dir}`,
      `--output-dir=${request.outputDir}`,
      "--phase=client",
    ];
    // The driver's --filter is matched against each spec's outputPath (exact or
    // substring), so a plain name works as a scope filter.
    if (request.nameFilter) args.push(`--filter=${request.nameFilter}`);

    args.push(...request.passthrough);

    ctx.log.step(`Generating with ${request.emitter.label} → ${request.outputDir}`);
    await runChecked("node", args, { cwd: pkgDir(ctx), prefix: request.logPrefix });
  },
};
