/* eslint-disable no-console */
import { resolve } from "path";
import type { CommandModule } from "yargs";
import { validateExamplesDir } from "../discover.js";
import { formatDiagnostics, formatSummary } from "../reporter.js";

interface ValidateArgs {
  dir: string;
  "warn-as-error": boolean;
}

/** `tsp-examples validate` — validate the unified examples files in a service directory. */
export const validateCommand: CommandModule<unknown, ValidateArgs> = {
  command: "validate [dir]",
  describe: "Validate unified examples format files (examples.yaml)",
  builder: (yargs) =>
    yargs
      .positional("dir", {
        type: "string",
        describe: "Service directory containing examples.yaml / examples/*.yaml and service.yaml",
        default: ".",
      })
      .option("warn-as-error", {
        type: "boolean",
        default: false,
        describe: "Treat warnings as errors (non-zero exit)",
      }),
  handler: async (args) => {
    const dir = resolve(process.cwd(), args.dir);
    const { diagnostics, files } = await validateExamplesDir(dir);

    if (files.length === 0) {
      console.error(
        `No examples files found in ${dir} (looked for examples.yaml and examples/*.yaml).`,
      );
      process.exit(1);
    }

    if (diagnostics.length > 0) {
      console.log(formatDiagnostics(diagnostics));
      console.log("");
    }
    console.log(formatSummary(diagnostics));

    const hasError = diagnostics.some((d) => d.severity === "error");
    const hasWarning = diagnostics.some((d) => d.severity === "warning");
    process.exit(hasError || (args["warn-as-error"] && hasWarning) ? 1 : 0);
  },
};
