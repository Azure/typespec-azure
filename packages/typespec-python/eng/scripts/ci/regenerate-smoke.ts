/* eslint-disable no-console */
/**
 * Regenerates Python SDK code for the real spec-repo services listed in
 * smoke-test-config.json and (optionally) fails on any diff vs the committed
 * snapshots under `packages/typespec-python/smoke-test/generated/`.
 *
 * Reuses the compile pipeline from `regenerate-common.ts`; the only new logic
 * is "config + fetched specs -> point the emitter at these specs / this output
 * folder".
 */
import { rmSync } from "fs";
import { dirname, resolve } from "path";
import pc from "picocolors";
import { fileURLToPath } from "url";
import { parseArgs } from "util";

import {
  checkDiff,
  fetchSpecs,
  loadConfig,
  type ServiceManifest,
} from "@azure-tools/typespec-python-smoke-test";

import {
  runParallel,
  toPosix,
  type CompileTask,
  type RegenerateContext,
  type TaskGroup,
} from "./regenerate-common.js";

const argv = parseArgs({
  args: process.argv.slice(2),
  options: {
    check: { type: "boolean" },
    name: { type: "string", short: "n" },
    debug: { type: "boolean", short: "d" },
    jobs: { type: "string", short: "j" },
  },
});

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
// eng/scripts/ci -> eng/scripts -> eng -> packageRoot
const PLUGIN_DIR = resolve(SCRIPT_DIR, "../../../");
const REPO_ROOT = resolve(PLUGIN_DIR, "../../"); // packages/typespec-python -> packages -> repoRoot
const SNAPSHOT_ROOT = resolve(PLUGIN_DIR, "smoke-test/generated");
const REL_SNAPSHOT = "packages/typespec-python/smoke-test/generated";

const ctx: RegenerateContext = {
  pluginDir: PLUGIN_DIR,
  // azureHttpSpecs / httpSpecs are unused for smoke specs (we set package-name
  // explicitly), but the type requires them.
  azureHttpSpecs: resolve(PLUGIN_DIR, "node_modules/@azure-tools/azure-http-specs/specs"),
  httpSpecs: resolve(PLUGIN_DIR, "node_modules/@typespec/http-specs/specs"),
  generatedFolder: resolve(PLUGIN_DIR, "generator"),
  emitterName: "@azure-tools/typespec-python",
};

function buildSmokeTaskGroups(manifests: ServiceManifest[], debug: boolean): TaskGroup[] {
  return manifests.map((m) => {
    const outputDir = toPosix(resolve(SNAPSHOT_ROOT, m.name));
    // Clear the output dir first so deletions are reflected in the diff.
    rmSync(outputDir, { recursive: true, force: true });
    const options: Record<string, unknown> = {
      flavor: "azure",
      "package-name": m.name,
      "emitter-output-dir": outputDir,
      "examples-dir": toPosix(resolve(m.serviceDir, "examples")),
      "generate-test": false,
      "generate-sample": false,
    };
    if (debug) options["debug"] = true;
    const task: CompileTask = { spec: m.entrypoint, outputDir, options };
    return { spec: m.entrypoint, tasks: [task] };
  });
}

async function main(): Promise<void> {
  const debug = argv.values.debug ?? false;
  const jobs = argv.values.jobs ? parseInt(argv.values.jobs, 10) : 4;

  const config = await loadConfig();
  const selected = argv.values.name
    ? { ...config, services: config.services.filter((s) => s.name.includes(argv.values.name!)) }
    : config;

  console.log(pc.cyan(`\nFetching ${selected.services.length} service(s) @ ${config.commit}`));
  const manifests = await fetchSpecs(selected);

  const groups = buildSmokeTaskGroups(manifests, debug);
  console.log(pc.cyan(`Regenerating ${groups.length} service(s) with ${jobs} jobs\n`));

  const results = await runParallel(groups, jobs, ctx);
  const failed = Array.from(results.values()).filter((v) => !v).length;
  if (failed > 0) {
    console.error(pc.red(`\nRegeneration failed for ${failed} service(s).`));
    process.exit(1);
  }
  console.log(pc.green(`\nRegeneration succeeded for ${groups.length} service(s).`));

  if (argv.values.check) {
    const { clean, diff } = await checkDiff(REPO_ROOT, REL_SNAPSHOT);
    if (!clean) {
      console.error(
        pc.red(
          `\nERROR: generated smoke-test code differs from the committed baseline.\n` +
            `Run "pnpm --filter @azure-tools/typespec-python run regenerate:smoke" and ` +
            `commit the changes under ${REL_SNAPSHOT}.\n`,
        ),
      );
      console.error(diff);
      process.exit(1);
    }
    console.log(pc.green("Diff check clean: snapshot matches generated output."));
  }
}

main().catch((err) => {
  console.error(pc.red(`\nUnexpected error: ${String(err)}`));
  process.exit(1);
});
