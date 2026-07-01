/**
 * typespec-rust adapter.
 *
 * The only rust-aware code in the tool. It satisfies the generic
 * {@link EmitterAdapter} contract by wrapping the package's own generation
 * driver `.scripts/tspcompile.js`, driven with `--emitter-dir` (the emitter
 * build to run) and `--output-dir` (an isolated output root) so any emitter
 * build can target any output dir.
 *
 * NOTE: @azure-tools/typespec-rust does not live in this repo yet (it is planned
 * to move here). Until it does, this adapter is inert — it fails fast with a
 * clear message if `packages/typespec-rust` is absent. When rust lands, its
 * driver needs two small hooks (mirroring python/typespec-ts), because today
 * `.scripts/tspcompile.js` hardcodes both:
 *
 *   const command = `node ${compiler} compile ${input} --emit=${pkgRoot} ...
 *     --option="@azure-tools/typespec-rust.emitter-output-dir=${fullOutputDir}"`;
 *
 * Add:
 *   --emitter-dir=<dir>  → use as the `--emit=` value instead of `pkgRoot`
 *   --output-dir=<dir>   → use as the base for `fullOutputDir` instead of `pkgRoot`
 *
 * The emitter's package name (@azure-tools/typespec-rust) still keys the
 * `--option` values, so a baseline build at a different path keeps its options.
 * The existing `--filter=<regex>` already scopes which crates generate.
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

const PACKAGE_NAME = "@azure-tools/typespec-rust";
const PKG_REL = "packages/typespec-rust";

function pkgDir(ctx: AdapterContext): string {
  return join(ctx.repoRoot, PKG_REL);
}

function assertPackagePresent(ctx: AdapterContext): void {
  if (!existsSync(pkgDir(ctx))) {
    throw new Error(
      `${PACKAGE_NAME} is not present in this repo yet (expected ${PKG_REL}). ` +
        `The rust emitter is planned to move here; once it does, this adapter works ` +
        `after its .scripts/tspcompile.js gains --emitter-dir/--output-dir hooks.`,
    );
  }
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

export const rustAdapter: EmitterAdapter = {
  name: "rust",
  packageName: PACKAGE_NAME,

  async prepareEmitter(
    ref: ClassifiedRef | "current",
    ctx: AdapterContext,
  ): Promise<ResolvedEmitter> {
    assertPackagePresent(ctx);

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
    // packages/typespec-rust; otherwise the resolved dir is the package itself.
    const candidate = existsSync(join(sourceRoot, PKG_REL))
      ? join(sourceRoot, PKG_REL)
      : sourceRoot;
    await ensureBuilt(candidate, ctx);
    return { dir: candidate, label: describeRef(ref, PACKAGE_NAME) };
  },

  async generate(request: GenerateRequest, ctx: AdapterContext): Promise<void> {
    assertPackagePresent(ctx);

    // tspcompile.js resolves specs from the package's own node_modules, so no
    // spec staging is needed; only the emitter build and output root vary.
    const args = [
      join(pkgDir(ctx), ".scripts", "tspcompile.js"),
      `--emitter-dir=${request.emitter.dir}`,
      `--output-dir=${request.outputDir}`,
    ];
    // The driver's --filter is a regex matched against each crate name.
    if (request.nameFilter) args.push(`--filter=${request.nameFilter}`);

    args.push(...request.passthrough);

    ctx.log.step(`Generating with ${request.emitter.label} → ${request.outputDir}`);
    await runChecked("node", args, { cwd: pkgDir(ctx), prefix: request.logPrefix });
  },
};
