import { resolvePath, type Program } from "@typespec/compiler";
import { createTester } from "@typespec/compiler/testing";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createAzuriteEmitterContext } from "../src/context.js";
import { normalizeOptions } from "../src/options.js";

export const ApiTester = createTester(resolvePath(import.meta.dirname, ".."), {
  libraries: [
    "@typespec/http",
    "@azure-tools/typespec-client-generator-core",
    "@azure-tools/typespec-azurite-emitter",
  ],
});

export const EmitterTester = ApiTester.emit("@azure-tools/typespec-azurite-emitter", {});

const FIXTURE_DIR = join(import.meta.dirname, "fixtures", "queue-pilot");

export function readFixture(name: string): string {
  return readFileSync(join(FIXTURE_DIR, name), "utf-8");
}

export function loadQueuePilotFixture(): Record<string, string> {
  return {
    "main.tsp": `import "./base.tsp";\nimport "./azurite.tsp";\n`,
    "base.tsp": readFixture("base.tsp"),
    "azurite.tsp": readFixture("azurite.tsp"),
  };
}

export function createTestAzuriteContext(program: Program) {
  return createAzuriteEmitterContext(program, normalizeOptions({}));
}
