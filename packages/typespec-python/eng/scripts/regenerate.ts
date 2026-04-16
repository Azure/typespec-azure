/* eslint-disable no-console */
/**
 * Regenerates Python SDK code from TypeSpec definitions.
 *
 * Uses in-process TypeSpec compilation to avoid subprocess spawning overhead.
 * This is significantly faster than spawning `tsp compile` for each spec.
 */

import { compile, NodeHost } from "@typespec/compiler";
import { promises, rmSync } from "fs";
import { platform } from "os";
import { dirname, join, relative, resolve } from "path";
import pc from "picocolors";
import { fileURLToPath } from "url";
import { parseArgs } from "util";

// ---- Shared constants ----

const SKIP_SPECS: string[] = ["type/file"];

const SpecialFlags: Record<string, Record<string, any>> = {
  azure: {
    "generate-test": true,
    "generate-sample": true,
  },
};

function toPosix(dir: string): string {
  return dir.replace(/\\/g, "/");
}

interface RegenerateFlags {
  flavor: string;
  debug: boolean;
  name?: string;
}

async function getSubdirectories(baseDir: string, flags: RegenerateFlags): Promise<string[]> {
  const subdirectories: string[] = [];

  async function searchDir(currentDir: string) {
    const items = await promises.readdir(currentDir, { withFileTypes: true });

    const promisesArray = items.map(async (item) => {
      const subDirPath = join(currentDir, item.name);
      if (item.isDirectory()) {
        const mainTspPath = join(subDirPath, "main.tsp");
        const clientTspPath = join(subDirPath, "client.tsp");

        const mainTspRelativePath = toPosix(relative(baseDir, mainTspPath));

        if (SKIP_SPECS.some((skipSpec) => mainTspRelativePath.includes(skipSpec))) return;

        const hasMainTsp = await promises
          .access(mainTspPath)
          .then(() => true)
          .catch(() => false);
        const hasClientTsp = await promises
          .access(clientTspPath)
          .then(() => true)
          .catch(() => false);

        if (mainTspRelativePath.toLowerCase().includes(flags.name || "")) {
          if (mainTspRelativePath.includes("resiliency/srv-driven")) {
            subdirectories.push(resolve(subDirPath, "old.tsp"));
          }
          if (hasClientTsp) {
            subdirectories.push(resolve(subDirPath, "client.tsp"));
          } else if (hasMainTsp) {
            subdirectories.push(resolve(subDirPath, "main.tsp"));
          }
        }

        await searchDir(subDirPath);
      }
    });

    await Promise.all(promisesArray);
  }

  await searchDir(baseDir);
  return subdirectories;
}

// Parse arguments
const argv = parseArgs({
  args: process.argv.slice(2),
  options: {
    flavor: { type: "string", short: "f" },
    name: { type: "string", short: "n" },
    debug: { type: "boolean", short: "d" },
    jobs: { type: "string", short: "j" },
    help: { type: "boolean", short: "h" },
  },
});

if (argv.values.help) {
  console.log(`
${pc.bold("Usage:")} tsx regenerate.ts [options]

${pc.bold("Description:")}
  Regenerates Python SDK code from TypeSpec definitions using in-process compilation.
  This avoids spawning a new Node.js process for each spec, making it significantly faster.

${pc.bold("Options:")}
  ${pc.cyan("-f, --flavor <azure|unbranded>")}
      SDK flavor to regenerate. If not specified, regenerates both flavors.

  ${pc.cyan("-n, --name <pattern>")}
      Filter packages by name pattern (case-insensitive substring match).

  ${pc.cyan("-d, --debug")}
      Enable debug output during regeneration.

  ${pc.cyan("-j, --jobs <n>")}
      Number of parallel compilation tasks (default: 30 on Linux/Mac, 10 on Windows).

  ${pc.cyan("-h, --help")}
      Show this help message.

${pc.bold("Examples:")}
  ${pc.dim("# Regenerate all packages for both flavors")}
  tsx regenerate.ts

  ${pc.dim("# Regenerate only Azure packages")}
  tsx regenerate.ts --flavor azure

  ${pc.dim("# Regenerate a specific package by name")}
  tsx regenerate.ts --flavor azure --name authentication-api-key
`);
  process.exit(0);
}

// Get paths
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PLUGIN_DIR = resolve(SCRIPT_DIR, "../../");
const AZURE_HTTP_SPECS = resolve(PLUGIN_DIR, "node_modules/@azure-tools/azure-http-specs/specs");
const HTTP_SPECS = resolve(PLUGIN_DIR, "node_modules/@typespec/http-specs/specs");
const EMITTER_NAME = "@azure-tools/typespec-python";

// Emitter options
const AZURE_EMITTER_OPTIONS: Record<string, Record<string, string> | Record<string, string>[]> = {
  "azure/client-generator-core/access": {
    namespace: "specs.azure.clientgenerator.core.access",
  },
  "azure/client-generator-core/alternate-type": {
    namespace: "specs.azure.clientgenerator.core.alternatetype",
  },
  "azure/client-generator-core/api-version": {
    namespace: "specs.azure.clientgenerator.core.apiversion",
  },
  "azure/client-generator-core/client-initialization/default": {
    namespace: "specs.azure.clientgenerator.core.clientinitialization.default",
  },
  "azure/client-generator-core/client-initialization/individually": {
    namespace: "specs.azure.clientgenerator.core.clientinitialization.individually",
  },
  "azure/client-generator-core/client-initialization/individuallyParent": {
    namespace: "specs.azure.clientgenerator.core.clientinitialization.individuallyparent",
  },
  "azure/client-generator-core/client-default-value": {
    namespace: "specs.azure.clientgenerator.core.clientdefaultvalue",
  },
  "azure/client-generator-core/client-doc": {
    namespace: "specs.azure.clientgenerator.core.clientdoc",
  },
  "azure/client-generator-core/client-location": {
    namespace: "specs.azure.clientgenerator.core.clientlocation",
  },
  "azure/client-generator-core/deserialize-empty-string-as-null": {
    namespace: "specs.azure.clientgenerator.core.emptystring",
  },
  "azure/client-generator-core/flatten-property": {
    namespace: "specs.azure.clientgenerator.core.flattenproperty",
  },
  "azure/client-generator-core/usage": {
    namespace: "specs.azure.clientgenerator.core.usage",
  },
  "azure/client-generator-core/override": {
    namespace: "specs.azure.clientgenerator.core.override",
  },
  "azure/client-generator-core/hierarchy-building": {
    namespace: "specs.azure.clientgenerator.core.hierarchybuilding",
  },
  "azure/client-generator-core/next-link-verb": {
    namespace: "specs.azure.clientgenerator.core.nextlinkverb",
  },
  "azure/client-generator-core/response-as-bool": {
    namespace: "specs.azure.clientgenerator.core.responseasbool",
  },
  "azure/core/basic": {
    namespace: "specs.azure.core.basic",
  },
  "azure/core/lro/rpc": {
    namespace: "specs.azure.core.lro.rpc",
  },
  "azure/core/lro/standard": {
    namespace: "specs.azure.core.lro.standard",
  },
  "azure/core/model": {
    namespace: "specs.azure.core.model",
  },
  "azure/core/page": {
    namespace: "specs.azure.core.page",
  },
  "azure/core/scalar": {
    namespace: "specs.azure.core.scalar",
  },
  "azure/core/traits": {
    namespace: "specs.azure.core.traits",
  },
  "azure/encode/duration": {
    namespace: "specs.azure.encode.duration",
  },
  "azure/example/basic": {
    namespace: "specs.azure.example.basic",
  },
  "azure/payload/pageable": {
    namespace: "specs.azure.payload.pageable",
  },
  "azure/versioning/previewVersion": {
    namespace: "specs.azure.versioning.previewversion",
  },
  "client/structure/default": {
    namespace: "client.structure.service",
  },
  "client/structure/multi-client": {
    "package-name": "client-structure-multiclient",
    namespace: "client.structure.multiclient",
  },
  "client/structure/renamed-operation": {
    "package-name": "client-structure-renamedoperation",
    namespace: "client.structure.renamedoperation",
  },
  "client/structure/two-operation-group": {
    "package-name": "client-structure-twooperationgroup",
    namespace: "client.structure.twooperationgroup",
  },
  "client/naming": {
    namespace: "client.naming.main",
  },
  "client/overload": {
    namespace: "client.overload",
  },
  "encode/duration": {
    namespace: "encode.duration",
  },
  "encode/numeric": {
    namespace: "encode.numeric",
  },
  "parameters/basic": {
    namespace: "parameters.basic",
  },
  "parameters/spread": {
    namespace: "parameters.spread",
  },
  "payload/content-negotiation": {
    namespace: "payload.contentnegotiation",
  },
  "payload/multipart": {
    namespace: "payload.multipart",
  },
  "serialization/encoded-name/json": {
    namespace: "serialization.encodedname.json",
  },
  "special-words": {
    namespace: "specialwords",
  },
  "service/multi-service": {
    namespace: "service.multiservice",
  },
};

const EMITTER_OPTIONS: Record<string, Record<string, string> | Record<string, string>[]> = {
  "resiliency/srv-driven/old.tsp": {
    "package-name": "resiliency-srv-driven1",
    namespace: "resiliency.srv.driven1",
    "package-mode": "azure-dataplane",
    "package-pprint-name": "ResiliencySrvDriven1",
  },
  "resiliency/srv-driven": {
    "package-name": "resiliency-srv-driven2",
    namespace: "resiliency.srv.driven2",
    "package-mode": "azure-dataplane",
    "package-pprint-name": "ResiliencySrvDriven2",
  },
  "authentication/api-key": {
    "clear-output-folder": "true",
  },
  "authentication/http/custom": {
    "package-name": "authentication-http-custom",
    namespace: "authentication.http.custom",
    "package-pprint-name": "Authentication Http Custom",
  },
  "authentication/union": [
    {
      "package-name": "authentication-union",
      namespace: "authentication.union",
    },
    {
      "package-name": "setuppy-authentication-union",
      namespace: "setuppy.authentication.union",
      "keep-setup-py": "true",
    },
  ],
  "type/array": {
    "package-name": "typetest-array",
    namespace: "typetest.array",
  },
  "type/dictionary": {
    "package-name": "typetest-dictionary",
    namespace: "typetest.dictionary",
  },
  "type/enum/extensible": {
    "package-name": "typetest-enum-extensible",
    namespace: "typetest.enum.extensible",
  },
  "type/enum/fixed": {
    "package-name": "typetest-enum-fixed",
    namespace: "typetest.enum.fixed",
  },
  "type/model/empty": {
    "package-name": "typetest-model-empty",
    namespace: "typetest.model.empty",
  },
  "type/model/inheritance/enum-discriminator": {
    "package-name": "typetest-model-enumdiscriminator",
    namespace: "typetest.model.enumdiscriminator",
  },
  "type/model/inheritance/nested-discriminator": {
    "package-name": "typetest-model-nesteddiscriminator",
    namespace: "typetest.model.nesteddiscriminator",
  },
  "type/model/inheritance/not-discriminated": {
    "package-name": "typetest-model-notdiscriminated",
    namespace: "typetest.model.notdiscriminated",
  },
  "type/model/inheritance/single-discriminator": {
    "package-name": "typetest-model-singlediscriminator",
    namespace: "typetest.model.singlediscriminator",
  },
  "type/model/inheritance/recursive": [
    {
      "package-name": "typetest-model-recursive",
      namespace: "typetest.model.recursive",
    },
    {
      "package-name": "generation-subdir",
      namespace: "generation.subdir",
      "generation-subdir": "_generated",
      "clear-output-folder": "true",
    },
  ],
  "type/model/usage": {
    "package-name": "typetest-model-usage",
    namespace: "typetest.model.usage",
  },
  "type/model/visibility": [
    {
      "package-name": "typetest-model-visibility",
      namespace: "typetest.model.visibility",
    },
    {
      "package-name": "headasbooleantrue",
      namespace: "headasbooleantrue",
      "head-as-boolean": "true",
    },
    {
      "package-name": "headasbooleanfalse",
      namespace: "headasbooleanfalse",
      "head-as-boolean": "false",
    },
  ],
  "type/property/nullable": {
    "package-name": "typetest-property-nullable",
    namespace: "typetest.property.nullable",
  },
  "type/property/optionality": {
    "package-name": "typetest-property-optional",
    namespace: "typetest.property.optional",
  },
  "type/property/additional-properties": {
    "package-name": "typetest-property-additionalproperties",
    namespace: "typetest.property.additionalproperties",
  },
  "type/scalar": {
    "package-name": "typetest-scalar",
    namespace: "typetest.scalar",
  },
  "type/property/value-types": {
    "package-name": "typetest-property-valuetypes",
    namespace: "typetest.property.valuetypes",
  },
  "type/union": {
    "package-name": "typetest-union",
    namespace: "typetest.union",
  },
  "type/union/discriminated": {
    "package-name": "typetest-discriminatedunion",
    namespace: "typetest.discriminatedunion",
  },
  "type/file": {
    "package-name": "typetest-file",
    namespace: "typetest.file",
  },
  documentation: {
    "package-name": "specs-documentation",
    namespace: "specs.documentation",
  },
  // Repo-specific overrides
  "client/structure/client-operation-group": {
    "package-name": "client-structure-clientoperationgroup",
    namespace: "client.structure.clientoperationgroup",
  },
};

interface CompileTask {
  spec: string;
  outputDir: string;
  options: Record<string, unknown>;
}

// Group of tasks for the same spec that must run sequentially
interface TaskGroup {
  spec: string;
  tasks: CompileTask[];
}

function defaultPackageName(spec: string): string {
  const specDir = spec.includes("azure") ? AZURE_HTTP_SPECS : HTTP_SPECS;
  return toPosix(relative(specDir, dirname(spec)))
    .replace(/\//g, "-")
    .toLowerCase();
}

function getEmitterOptions(spec: string, flavor: string): Record<string, string>[] {
  const specDir = spec.includes("azure") ? AZURE_HTTP_SPECS : HTTP_SPECS;
  const relativeSpec = toPosix(relative(specDir, spec));
  const key = relativeSpec.includes("resiliency/srv-driven/old.tsp")
    ? relativeSpec
    : dirname(relativeSpec);
  const emitterOpts = EMITTER_OPTIONS[key] ||
    (flavor === "azure" ? AZURE_EMITTER_OPTIONS[key] : [{}]) || [{}];
  return Array.isArray(emitterOpts) ? emitterOpts : [emitterOpts];
}

function buildTaskGroups(specs: string[], flags: RegenerateFlags): TaskGroup[] {
  const groups: TaskGroup[] = [];

  for (const spec of specs) {
    const tasks: CompileTask[] = [];

    for (const emitterConfig of getEmitterOptions(spec, flags.flavor)) {
      const options: Record<string, unknown> = { ...emitterConfig };

      // Add flavor-specific options
      options["flavor"] = flags.flavor;
      for (const [k, v] of Object.entries(SpecialFlags[flags.flavor] ?? {})) {
        options[k] = v;
      }

      // Set output directory - use tests/generated/<flavor>/<package> structure
      const packageName = (options["package-name"] as string) || defaultPackageName(spec);
      const outputDir =
        (options["emitter-output-dir"] as string) ||
        toPosix(`${PLUGIN_DIR}/tests/generated/${flags.flavor}/${packageName}`);
      options["emitter-output-dir"] = outputDir;

      // Debug mode
      if (flags.debug) {
        options["debug"] = true;
      }

      // Examples directory
      options["examples-dir"] = toPosix(join(dirname(spec), "examples"));

      tasks.push({ spec, outputDir, options });
    }

    groups.push({ spec, tasks });
  }

  return groups;
}

async function compileSpec(task: CompileTask): Promise<{ success: boolean; error?: string }> {
  const { spec, outputDir, options } = task;

  try {
    // Build compiler options
    const compilerOptions = {
      emit: [PLUGIN_DIR],
      options: {
        [EMITTER_NAME]: options,
      },
    };

    // Compile using TypeSpec compiler directly (no subprocess)
    const program = await compile(NodeHost, spec, compilerOptions);

    if (program.hasError()) {
      const errors = program.diagnostics
        .filter((d) => d.severity === "error")
        .map((d) => d.message)
        .join("\n");
      return { success: false, error: errors };
    }

    return { success: true };
  } catch (err) {
    // Clean up on error
    rmSync(outputDir, { recursive: true, force: true });
    return { success: false, error: String(err) };
  }
}

async function runParallel(groups: TaskGroup[], maxJobs: number): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();
  const executing: Set<Promise<void>> = new Set();

  // Count total tasks for progress
  const totalTasks = groups.reduce((sum, g) => sum + g.tasks.length, 0);
  let completed = 0;

  for (const group of groups) {
    // Each group runs as a unit - tasks within a group run sequentially
    // But different groups can run in parallel
    const runGroup = async () => {
      const specDir = group.spec.includes("azure") ? AZURE_HTTP_SPECS : HTTP_SPECS;
      const shortName = toPosix(relative(specDir, dirname(group.spec)));

      // Run all tasks in this group sequentially to avoid state pollution
      let groupSuccess = true;
      for (const task of group.tasks) {
        const packageName = (task.options["package-name"] as string) || shortName;
        console.log(pc.blue(`[${completed + 1}/${totalTasks}] Compiling ${packageName}...`));

        const result = await compileSpec(task);
        completed++;

        if (result.success) {
          console.log(pc.green(`[${completed}/${totalTasks}] ${packageName} succeeded`));
        } else {
          console.log(
            pc.red(`[${completed}/${totalTasks}] ${packageName} failed: ${result.error}`),
          );
          groupSuccess = false;
        }
      }

      results.set(group.spec, groupSuccess);
    };

    const p = runGroup().finally(() => executing.delete(p));
    executing.add(p);

    if (executing.size >= maxJobs) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

// Preprocess: create files that should be deleted after regeneration (for testing)
async function preprocess(flavor: string): Promise<void> {
  if (flavor === "azure") {
    const generalParts = [PLUGIN_DIR, "tests", "generated", "azure"];
    const authFile = join(
      ...generalParts,
      "authentication-api-key",
      "authentication",
      "apikey",
      "_operations",
      "to_be_deleted.py",
    );
    await promises.mkdir(dirname(authFile), { recursive: true });
    await promises.writeFile(authFile, "# This file is to be deleted after regeneration");

    const folderParts = [...generalParts, "generation-subdir"];
    const genFile = join(...folderParts, "generation", "subdir", "_generated", "to_be_deleted.py");
    await promises.mkdir(dirname(genFile), { recursive: true });
    await promises.writeFile(genFile, "# This file is to be deleted after regeneration");

    const testFile = join(...folderParts, "generated_tests", "to_be_deleted.py");
    await promises.mkdir(dirname(testFile), { recursive: true });
    await promises.writeFile(testFile, "# This file is to be kept after regeneration");

    const keptFile = join(...folderParts, "generation", "subdir", "to_be_kept.py");
    await promises.mkdir(dirname(keptFile), { recursive: true });
    await promises.writeFile(keptFile, "# This file is to be kept after regeneration");
  }
}

async function regenerateFlavor(
  flavor: string,
  name: string | undefined,
  debug: boolean,
  jobs: number,
): Promise<boolean> {
  console.log(pc.cyan(`\n${"=".repeat(60)}`));
  console.log(pc.cyan(`Regenerating ${flavor} flavor`));
  console.log(pc.cyan(`${"=".repeat(60)}\n`));

  const flags: RegenerateFlags = { flavor, debug, name };

  // Preprocess
  await preprocess(flavor);

  // Collect specs
  const azureSpecs = flavor === "azure" ? await getSubdirectories(AZURE_HTTP_SPECS, flags) : [];
  const standardSpecs = await getSubdirectories(HTTP_SPECS, flags);
  const allSpecs = [...azureSpecs, ...standardSpecs];

  // Build task groups (tasks for same spec run sequentially to avoid state pollution)
  const groups = buildTaskGroups(allSpecs, flags);
  const totalTasks = groups.reduce((sum, g) => sum + g.tasks.length, 0);

  console.log(pc.cyan(`Found ${allSpecs.length} specs (${totalTasks} total tasks) to compile`));
  console.log(pc.cyan(`Using ${jobs} parallel jobs\n`));

  // Run compilation
  const startTime = performance.now();
  const results = await runParallel(groups, jobs);
  const duration = (performance.now() - startTime) / 1000;

  // Summary
  const succeeded = Array.from(results.values()).filter((v) => v).length;
  const failed = results.size - succeeded;

  console.log(pc.cyan(`\n${"=".repeat(60)}`));
  console.log(pc.cyan(`Results: ${succeeded} succeeded, ${failed} failed`));
  console.log(pc.cyan(`Time: ${duration.toFixed(1)}s`));
  console.log(pc.cyan(`${"=".repeat(60)}\n`));

  return failed === 0;
}

async function main() {
  const isWindows = platform() === "win32";
  const flavor = argv.values.flavor;
  const name = argv.values.name;
  const debug = argv.values.debug ?? false;
  // Windows has slower file system operations and process spawning,
  // so use fewer parallel jobs to avoid I/O contention and memory pressure
  const defaultJobs = isWindows ? 10 : 30;
  const jobs = argv.values.jobs ? parseInt(argv.values.jobs, 10) : defaultJobs;

  console.log(pc.cyan(`\nRegeneration config:`));
  console.log(pc.cyan(`  Platform: ${isWindows ? "Windows" : "Unix"}`));
  console.log(pc.cyan(`  Mode:     in-process compilation`));
  console.log(pc.cyan(`  Jobs:     ${jobs}`));
  if (name) {
    console.log(pc.cyan(`  Filter:   ${name}`));
  }
  console.log();

  const startTime = performance.now();
  let success: boolean;

  if (flavor) {
    success = await regenerateFlavor(flavor, name, debug, jobs);
  } else {
    // Both flavors
    const azureSuccess = await regenerateFlavor("azure", name, debug, jobs);
    const unbrandedSuccess = await regenerateFlavor("unbranded", name, debug, jobs);
    success = azureSuccess && unbrandedSuccess;
  }

  const totalDuration = (performance.now() - startTime) / 1000;
  console.log(
    success
      ? pc.green(`\nRegeneration completed successfully in ${totalDuration.toFixed(1)}s`)
      : pc.red(`\nRegeneration failed after ${totalDuration.toFixed(1)}s`),
  );

  process.exit(success ? 0 : 1);
}

main().catch((err) => {
  console.error(pc.red(`Fatal error: ${err}`));
  process.exit(1);
});
