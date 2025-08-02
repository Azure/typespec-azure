import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { join } from "pathe";
import { parse } from "yaml";
import { runIntegrationTestSuite } from "./run.js";
import { projectRoot } from "./utils.js";

process.on("SIGINT", () => process.exit(0));

const args = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: {
    clean: {
      type: "boolean",
      default: false,
    },
  },
});

const suiteName = args.positionals[0];
const config = parse(
  await readFile(join(projectRoot, "config/integration-test-config.yaml"), "utf8"),
);
const suite = config.suites[suiteName];
if (suite === undefined) {
  throw new Error(`Integration test suite "${suiteName}" not found in config.`);
}

const wd = join(projectRoot, "temp", suiteName);
await runIntegrationTestSuite(wd, suiteName, suite, {
  clean: args.values.clean,
});
