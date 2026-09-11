#!/usr/bin/env node
/* eslint-disable no-console */
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { validateCommand } from "./commands/validate.js";

/**
 * `tsp-examples` — the permanent CLI for the unified examples format. Sub-commands operate on a
 * service's `examples.yaml` (`scaffold` and `add` are registered here as they land).
 */
async function main(): Promise<void> {
  await yargs(hideBin(process.argv))
    .scriptName("tsp-examples")
    .command(validateCommand)
    .demandCommand(1, "Specify a command (e.g. `validate`).")
    .strict()
    .help()
    .parseAsync();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
