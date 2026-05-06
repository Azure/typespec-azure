/* eslint-disable no-console */
import pc from "picocolors";
import { parseArgs } from "util";

const argv = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: "boolean", short: "h" },
  },
});

if (argv.values.help) {
  console.log(`
${pc.bold("Usage:")} tsx lint.ts [options]

${pc.bold("Description:")}
  Run extra linting checks beyond what tox provides.
  Python linting (pylint) is handled by tox via test:python:e2e --env lint.

${pc.bold("Options:")}
  ${pc.cyan("-h, --help")}
      Show this help message.
`);
  process.exit(0);
}

async function main(): Promise<void> {
  // Python linting (pylint) is handled by tox environments (lint-azure, lint-unbranded).
  // This script is reserved for any additional linting not covered by tox.
  console.log(
    `${pc.green("✓")} Python linting is handled by tox (lint-azure, lint-unbranded). No extra lint checks needed.`,
  );
}

main().catch((error) => {
  console.error(`${pc.red("Unexpected error:")}`, error);
  process.exit(1);
});
