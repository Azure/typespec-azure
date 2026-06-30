#!/usr/bin/env node
/**
 * emitter-diff — language-agnostic CLI.
 *
 * Generates code from the test specs with two emitter versions (baseline + head)
 * and diffs the output. All language specifics live behind the selected adapter;
 * this file contains zero language logic.
 */
import { join } from "node:path";
import { parseArgs } from "node:util";

import { diffDirs, openInVsCode, printDiff, writeHtml } from "./diff.ts";
import { getAdapter, listAdapters } from "./registry.ts";
import {
  classifyRef,
  defaultWorkDir,
  installNpmPackage as installNpm,
  resolveSource as resolveSrc,
} from "./resolver.ts";
import type { AdapterContext, ClassifiedRef } from "./types.ts";
import { color, createLogger, ensureDir, runChecked } from "./util.ts";

const HELP = `${color.bold("emitter-diff")} — diff generated code across emitter versions

${color.bold("Usage:")}
  emitter-diff --emitter <name> --baseline <ref> [options]

${color.bold("Required:")}
  --emitter <name>        Adapter to use. Available: ${listAdapters().join(", ")}
  --baseline <ref>        Old emitter to compare against.

${color.bold("Refs")} (for --baseline / --head / --specs):
  npm:1.2.3 | 1.2.3                 a published package version
  local:/path | ./path             a local folder
  github:owner/repo@<sha|branch>   a GitHub source at a ref
  gh:<sha|branch>                  the current repo at a ref

${color.bold("Options:")}
  --head <ref>            New emitter. Default: current checkout.
  --specs <ref>           Spec inputs: all (default) | local | github.
  --name <pattern>        Filter which specs/packages are generated.
  --work-dir <dir>        Scratch dir (default: a temp dir).
  --open                  Open the diff in VS Code (local).
  --html <file>           Write a rendered HTML diff (CI).
  --fail-on-diff          Exit non-zero when output differs (CI gating).
  --run-tests             Run the adapter's test suites on the output.
  --test-env <csv>        Suites to run (adapter-defined), e.g. test,lint,mypy.
  --test-target <which>   head | baseline | both (default: head).
  --opt key=value         Repeatable adapter-specific option (e.g. --opt flavor=azure).
  -- <args>               Everything after -- is forwarded to the adapter.
  -h, --help              Show this help.
`;

async function main(): Promise<number> {
  const rawArgs = process.argv.slice(2);

  // Split off adapter passthrough after a standalone `--`.
  const sepIndex = rawArgs.indexOf("--");
  const ownArgs = sepIndex === -1 ? rawArgs : rawArgs.slice(0, sepIndex);
  const passthrough = sepIndex === -1 ? [] : rawArgs.slice(sepIndex + 1);

  const { values } = parseArgs({
    args: ownArgs,
    options: {
      emitter: { type: "string" },
      baseline: { type: "string" },
      head: { type: "string" },
      specs: { type: "string" },
      name: { type: "string" },
      "work-dir": { type: "string" },
      open: { type: "boolean" },
      html: { type: "string" },
      "fail-on-diff": { type: "boolean" },
      "run-tests": { type: "boolean" },
      "test-env": { type: "string" },
      "test-target": { type: "string", default: "head" },
      opt: { type: "string", multiple: true },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: false,
  });

  const log = createLogger();

  if (values.help || ownArgs.length === 0) {
    process.stdout.write(HELP);
    return 0;
  }
  if (!values.emitter) {
    log.error("--emitter is required (no default). " + `Available: ${listAdapters().join(", ")}`);
    return 2;
  }
  if (!values.baseline) {
    log.error("--baseline is required.");
    return 2;
  }

  if (!listAdapters().includes(values.emitter)) {
    log.error(
      `Unknown emitter '${values.emitter}'. Available: ${listAdapters().join(", ")}`,
    );
    return 2;
  }
  const adapter = getAdapter(values.emitter);

  // Repo root = current git working tree.
  const repoRoot = (
    await runChecked("git", ["rev-parse", "--show-toplevel"])
  ).stdout.trim();

  const workDir = ensureDir(values["work-dir"] ? join(values["work-dir"]) : defaultWorkDir());
  log.info(`${color.dim("work dir:")} ${workDir}`);

  const ctx: AdapterContext = {
    repoRoot,
    workDir,
    log,
    resolveSource: (ref, _packageName) => resolveSrc(ref, workDir, log),
    installNpmPackage: (packageName, version) =>
      installNpm(packageName, version, workDir, log),
  };

  // Parse adapter options (--opt key=value).
  const options: Record<string, string> = {};
  for (const entry of values.opt ?? []) {
    const eq = entry.indexOf("=");
    if (eq === -1) {
      log.error(`Invalid --opt '${entry}'. Expected key=value.`);
      return 2;
    }
    options[entry.slice(0, eq)] = entry.slice(eq + 1);
  }

  // Resolve emitters.
  const baselineRef = classifyRef(values.baseline, repoRoot);
  const headRef: ClassifiedRef | "current" = values.head
    ? classifyRef(values.head, repoRoot)
    : "current";

  log.step("Preparing baseline emitter");
  const baselineEmitter = await adapter.prepareEmitter(baselineRef, ctx);
  log.step("Preparing head emitter");
  const headEmitter = await adapter.prepareEmitter(headRef, ctx);

  // Resolve specs source (local/github). `all`/omitted => adapter default (repo).
  let specsDir: string | undefined;
  if (values.specs && values.specs.toLowerCase() !== "all") {
    const specsRef = classifyRef(values.specs, repoRoot);
    if (specsRef.kind === "npm") {
      log.error("--specs as an npm version is not supported; use a local folder or github ref.");
      return 2;
    }
    specsDir = await resolveSrc(specsRef, workDir, log);
  }

  // Generate both sides.
  const baselineOut = ensureDir(join(workDir, "baseline"));
  const headOut = ensureDir(join(workDir, "head"));

  await adapter.generate(
    {
      emitter: baselineEmitter,
      specsDir,
      outputDir: baselineOut,
      nameFilter: values.name,
      options,
      passthrough,
    },
    ctx,
  );
  await adapter.generate(
    {
      emitter: headEmitter,
      specsDir,
      outputDir: headOut,
      nameFilter: values.name,
      options,
      passthrough,
    },
    ctx,
  );

  // Diff.
  const diff = await diffDirs(baselineOut, headOut, log);
  printDiff(diff, log);

  if (values.open) await openInVsCode(baselineOut, headOut, workDir, log);
  if (values.html) await writeHtml(diff, values.html, log);

  // Optionally run test suites.
  if (values["run-tests"]) {
    if (!adapter.runTests) {
      log.warn(`Adapter '${adapter.name}' does not support --run-tests yet.`);
    } else {
      const envs = values["test-env"]?.split(",").map((s) => s.trim()).filter(Boolean);
      const target = values["test-target"] ?? "head";
      const targets: Array<{ label: string; dir: string }> = [];
      if (target === "head" || target === "both") targets.push({ label: "head", dir: headOut });
      if (target === "baseline" || target === "both")
        targets.push({ label: "baseline", dir: baselineOut });

      for (const t of targets) {
        log.step(`Running test suites on ${t.label} output`);
        await adapter.runTests(
          { outputDir: t.dir, envs, nameFilter: values.name, options, passthrough },
          ctx,
        );
      }
    }
  }

  if (values["fail-on-diff"] && diff.hasChanges) {
    log.error("Differences detected and --fail-on-diff is set.");
    return 1;
  }
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    createLogger().error(err?.stack ?? String(err));
    process.exit(1);
  });
