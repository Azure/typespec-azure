#!/usr/bin/env node
/* eslint-disable no-console */
import { resolve } from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { validateExamplesDir } from "./discover.js";
import { formatDiagnostics, formatSummary } from "./reporter.js";

async function main(): Promise<void> {
  const args = await yargs(hideBin(process.argv))
    .scriptName("examples-validate")
    .usage("$0 [dir]", "Validate unified examples format files (examples.yaml)")
    .positional("dir", {
      type: "string",
      describe: "Service directory containing examples.yaml / examples/*.yaml and service.yaml",
      default: ".",
    })
    .option("warn-as-error", {
      type: "boolean",
      default: false,
      describe: "Treat warnings as errors (non-zero exit)",
    })
    .strict()
    .help()
    .parse();

  const dir = resolve(process.cwd(), args.dir as string);
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
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
