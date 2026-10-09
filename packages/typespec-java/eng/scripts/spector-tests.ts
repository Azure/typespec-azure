/* eslint-disable no-console */
import { execa } from "execa";
import { copyFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const emitterTestsRoot = join(packageRoot, "emitter-tests");

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

console.log("Starting the Spector server");
await execa("pnpm", ["run", "spector-start"], { cwd: packageRoot, stdio: "inherit" });

let testError: unknown;
try {
  console.log("Compile and run the tests");
  await execa("mvn", ["clean", "test", "--no-transfer-progress", "-T", "1C"], {
    cwd: emitterTestsRoot,
    stdio: "inherit",
  });
} catch (error) {
  testError = error;
}

console.log("Stopping the Spector server");
await execa("pnpm", ["run", "spector-stop"], { cwd: packageRoot, stdio: "inherit" });

try {
  await copyFile(
    join(emitterTestsRoot, "tsp-spector-coverage-java.json"),
    join(packageRoot, "node_modules", "@azure-tools", "azure-http-specs", "spec-coverage.json"),
  );
} catch (error) {
  if (!isErrnoException(error) || error.code !== "ENOENT") {
    throw error;
  }
}

if (testError) {
  throw testError;
}

console.log("Finished running the Spector tests");
