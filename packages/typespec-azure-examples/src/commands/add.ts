/* eslint-disable no-console */
import { mkdir, writeFile } from "fs/promises";
import { dirname, join, resolve } from "path";
import type { CommandModule } from "yargs";
import { add } from "../add/index.js";
import { loadExampleFile } from "../loader.js";
import { formatDiagnostics, formatSummary } from "../reporter.js";
import { validateExampleFiles } from "../validate.js";

interface AddArgs {
  dir: string;
  "api-version"?: string;
  namespace?: string;
  "dry-run": boolean;
  "warn-as-error": boolean;
}

/**
 * `tsp-examples add` — add examples for a new API version. Only operations that are new or whose
 * contract changed since the previous version get an entry; unchanged operations are left alone.
 */
export const addCommand: CommandModule<unknown, AddArgs> = {
  command: "add [dir]",
  describe: "Add examples for a new API version (only where an operation is new or changed)",
  builder: (yargs) =>
    yargs
      .positional("dir", {
        type: "string",
        describe: "Service directory containing the versioned Swagger, service.yaml and examples",
        default: ".",
      })
      .option("api-version", {
        type: "string",
        describe: "Target API version (defaults to the newest version in service.yaml)",
      })
      .option("namespace", {
        type: "string",
        describe: "Override the $namespace written into any newly created example file",
      })
      .option("dry-run", {
        type: "boolean",
        default: false,
        describe: "Print the updated files instead of writing them",
      })
      .option("warn-as-error", {
        type: "boolean",
        default: false,
        describe: "Treat warnings as errors (non-zero exit)",
      }),
  handler: async (args) => {
    const dir = resolve(process.cwd(), args.dir);
    const result = await add(dir, {
      apiVersion: args["api-version"],
      namespace: args.namespace,
    });

    // Validate the updated files through the same rules as `tsp-examples validate`.
    const diagnostics = [
      ...result.diagnostics,
      ...validateExampleFiles(
        result.files.map((f) => loadExampleFile(f.path, f.content)),
        { serviceVersions: undefined },
      ),
    ];

    if (result.targetVersion) {
      console.log(
        `Target version ${result.targetVersion}` +
          (result.previousVersion ? ` (previous ${result.previousVersion})` : " (first version)") +
          `: added ${result.added.length} example(s).`,
      );
    }
    for (const entry of result.added) {
      const how = entry.cloned ? "cloned" : "skeleton";
      console.log(
        `  + ${entry.operationKey} → ${entry.file} [${entry.kind}, ${how}] — ${entry.detail}`,
      );
    }

    if (args["dry-run"]) {
      for (const file of result.files) {
        console.log(`\n# ${file.path}`);
        console.log(file.content);
      }
    } else {
      for (const file of result.files) {
        const target = join(dir, file.path);
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, file.content, "utf-8");
        console.log(`Wrote ${target}`);
      }
    }

    if (diagnostics.length > 0) {
      console.log("");
      console.log(formatDiagnostics(diagnostics));
      console.log("");
      console.log(formatSummary(diagnostics));
    }

    const hasError = diagnostics.some((d) => d.severity === "error");
    const hasWarning = diagnostics.some((d) => d.severity === "warning");
    process.exit(hasError || (args["warn-as-error"] && hasWarning) ? 1 : 0);
  },
};
