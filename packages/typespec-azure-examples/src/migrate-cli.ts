#!/usr/bin/env node
/* eslint-disable no-console */
import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join, resolve } from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { loadExampleFile, parseServiceVersions } from "./loader.js";
import { migrate } from "./migrate/index.js";
import { formatDiagnostics, formatSummary } from "./reporter.js";
import { validateExampleFiles } from "./validate.js";

async function readServiceVersions(path: string): Promise<string[] | undefined> {
  try {
    return parseServiceVersions(await readFile(path, "utf-8")).versions;
  } catch {
    return undefined;
  }
}

async function main(): Promise<void> {
  const args = await yargs(hideBin(process.argv))
    .scriptName("tsp-examples-migrate")
    .usage("$0 <specDir>", "Migrate x-ms-examples JSON into the unified examples.yaml format")
    .positional("specDir", {
      type: "string",
      describe: "Root of the versioned Swagger specs (contains stable/preview/<version>/*.json)",
    })
    .demandCommand(0)
    .option("out", {
      type: "string",
      default: ".",
      describe: "Output directory for the generated examples.yaml / examples/*.yaml",
    })
    .option("namespace", {
      type: "string",
      describe: "Override the $namespace (otherwise detected from /providers/<NS>/ paths)",
    })
    .option("split-by-interface", {
      type: "boolean",
      describe: "Force splitting output into examples/<Interface>.yaml",
    })
    .option("service", {
      type: "string",
      describe:
        "Path to a service.yaml providing the authoritative version order (defaults to <specDir>/service.yaml if present)",
    })
    .option("dry-run", {
      type: "boolean",
      default: false,
      describe: "Print the generated files instead of writing them",
    })
    .option("warn-as-error", {
      type: "boolean",
      default: false,
      describe: "Treat validation warnings as errors (non-zero exit)",
    })
    .strict()
    .help()
    .parse();

  const specDir = resolve(process.cwd(), (args.specDir as string | undefined) ?? ".");
  const outDir = resolve(process.cwd(), args.out as string);

  // Prefer the service.yaml as the authoritative version list so generated `since` values only
  // reference real service versions (on-disk swagger folders not listed there are ignored).
  const serviceYamlPath = args.service
    ? resolve(process.cwd(), args.service as string)
    : join(specDir, "service.yaml");
  const versionOrder = await readServiceVersions(serviceYamlPath);
  if (versionOrder && versionOrder.length > 0) {
    console.log(`Using version order from ${serviceYamlPath} (${versionOrder.length} versions).`);
  }

  const result = await migrate(specDir, {
    namespace: args.namespace as string | undefined,
    splitByInterface: args["split-by-interface"] as boolean | undefined,
    versionOrder: versionOrder && versionOrder.length > 0 ? versionOrder : undefined,
  });

  if (result.files.length === 0) {
    console.error(`No x-ms-examples found under ${specDir}.`);
    process.exit(1);
  }

  // Validate the generated output through the same rules as `tsp-examples validate`.
  const diagnostics = validateExampleFiles(
    result.files.map((f) => loadExampleFile(f.path, f.content)),
    { serviceVersions: result.versions },
  );

  if (args["dry-run"]) {
    for (const file of result.files) {
      console.log(`# ${file.path}`);
      console.log(file.content);
    }
  } else {
    for (const file of result.files) {
      const target = join(outDir, file.path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.content, "utf-8");
      console.log(`Wrote ${target}`);
    }
  }

  console.log(
    `Migrated ${result.operationCount} operation(s) across ${result.versions.length} version(s)` +
      (result.namespace ? ` under ${result.namespace}` : "") +
      `.`,
  );

  if (diagnostics.length > 0) {
    console.log("");
    console.log(formatDiagnostics(diagnostics));
    console.log("");
    console.log(formatSummary(diagnostics));
  }

  const hasError = diagnostics.some((d) => d.severity === "error");
  const hasWarning = diagnostics.some((d) => d.severity === "warning");
  process.exit(hasError || (args["warn-as-error"] && hasWarning) ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
