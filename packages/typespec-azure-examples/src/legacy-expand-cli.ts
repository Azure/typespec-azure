#!/usr/bin/env node
/* eslint-disable no-console */
import { mkdir, writeFile } from "fs/promises";
import { join, resolve } from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { formatDiagnostics, formatSummary } from "./reporter.js";
import { resolveLegacyExamples } from "./resolve/index.js";

async function main(): Promise<void> {
  const args = await yargs(hideBin(process.argv))
    .scriptName("tsp-examples-legacy-expand")
    .usage(
      "$0 <dir>",
      "Expand the unified examples into classic x-ms-examples files for a target API version",
    )
    .positional("dir", {
      type: "string",
      describe: "Service directory containing examples.yaml / examples/*.yaml and service.yaml",
    })
    .demandCommand(0)
    .option("api-version", {
      type: "string",
      demandOption: true,
      describe: "Target API version to resolve for (must be listed in service.yaml)",
    })
    .option("out", {
      type: "string",
      describe: "Directory to write the classic x-ms-examples JSON files into (defaults to stdout)",
    })
    .strict()
    .help()
    .parse();

  const dir = resolve(process.cwd(), (args.dir as string | undefined) ?? ".");
  const apiVersion = args["api-version"] as string;

  const result = await resolveLegacyExamples(dir, apiVersion);

  if (result.diagnostics.length > 0) {
    console.error(formatDiagnostics(result.diagnostics));
    console.error("");
    console.error(formatSummary(result.diagnostics));
  }
  if (result.diagnostics.some((d) => d.severity === "error")) {
    process.exit(1);
  }

  if (args.out) {
    const outDir = resolve(process.cwd(), args.out as string);
    await mkdir(outDir, { recursive: true });
    for (const file of result.files) {
      await writeFile(join(outDir, file.fileName), JSON.stringify(file.document, null, 2) + "\n");
    }
    console.error(`Wrote ${result.files.length} x-ms-examples file(s) to ${outDir}`);
  } else {
    // Print a filename -> document map so the output is inspectable without writing to disk.
    const map = Object.fromEntries(result.files.map((f) => [f.fileName, f.document]));
    console.log(JSON.stringify(map, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
