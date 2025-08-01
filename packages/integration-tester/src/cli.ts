import { readFile, rm } from "node:fs/promises";
import { parseArgs } from "node:util";
import { join, resolve } from "pathe";
import { parse } from "yaml";
import { runIntegrationTestSuite } from "./run.js";

const args = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: {},
});

const projectRoot = resolve(import.meta.dirname, "../..");
const suiteName = args.positionals[0];
const config = parse(
  await readFile(join(projectRoot, "config/integration-test-config.yaml"), "utf8"),
);
const suite = config.suites[suiteName];
if (suite === undefined) {
  throw new Error(`Integration test suite "${suiteName}" not found in config.`);
}

const wd = join(projectRoot, "temp", suiteName);

await rm(wd, { recursive: true, force: true });
await runIntegrationTestSuite(wd, suiteName, config);
