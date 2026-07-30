#!/usr/bin/env node
/* eslint-disable no-console */
import { mkdir, writeFile } from "fs/promises";
import { dirname, resolve } from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { formatDiagnostics, formatSummary } from "./reporter.js";
import { resolveExamplesDir } from "./resolve/index.js";

async function main(): Promise<void> {
  const args = await yargs(hideBin(process.argv))
    .scriptName("examples-resolve")
    .usage("$0 <dir>", "Resolve the applicable examples for a target API version")
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
      describe: "Write the resolved examples JSON to this file instead of stdout",
    })
    .strict()
    .help()
    .parse();

  const dir = resolve(process.cwd(), (args.dir as string | undefined) ?? ".");
  const apiVersion = args["api-version"] as string;

  const result = await resolveExamplesDir(dir, apiVersion);

  if (result.diagnostics.length > 0) {
    console.error(formatDiagnostics(result.diagnostics));
    console.error("");
    console.error(formatSummary(result.diagnostics));
  }
  if (result.diagnostics.some((d) => d.severity === "error")) {
    process.exit(1);
  }

  const output = {
    apiVersion: result.apiVersion,
    examples: result.examples.map((e) => ({
      operation: e.operation,
      ...(e.title ? { title: e.title } : {}),
      request: e.request,
      responses: e.responses,
    })),
  };
  const json = JSON.stringify(output, null, 2);

  if (args.out) {
    const target = resolve(process.cwd(), args.out as string);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, json + "\n", "utf-8");
    console.error(`Wrote ${result.examples.length} resolved example(s) to ${target}`);
  } else {
    console.log(json);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
