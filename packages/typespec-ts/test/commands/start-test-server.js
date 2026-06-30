/* eslint-disable no-console */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";

const PORT = "3002";
const COVERAGE_DIR = "coverage";
const COVERAGE_FILE = `./${COVERAGE_DIR}/spector-coverage-typescript-azure.json`;
const SPEC_PATHS = [
  "./node_modules/@azure-tools/azure-http-specs/specs",
  "./node_modules/@typespec/http-specs/specs",
];

// tsp-spector writes the coverage file with a plain writeFileSync, so the
// destination directory has to exist beforehand or the report is silently
// dropped. Once https://github.com/microsoft/typespec/issues/11116 is fixed
// upstream, this script can hand off directly to `tsp-spector serve`.
try {
  mkdirSync(COVERAGE_DIR, { recursive: true });
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error);
  console.error(
    `Failed to create the coverage directory "${COVERAGE_DIR}" required by tsp-spector: ${reason}`,
  );
  process.exit(1);
}

const child = spawn(
  "npx",
  ["tsp-spector", "serve", ...SPEC_PATHS, "--port", PORT, "--coverageFile", COVERAGE_FILE],
  { stdio: "inherit", shell: true },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
