import { resolvePath } from "@typespec/compiler";
import { createTester } from "@typespec/compiler/testing";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const ApiTester = createTester(resolvePath(import.meta.dirname, ".."), {
  libraries: ["@typespec/http", "@azure-tools/typespec-azurite-emitter-pilot"],
});

export const EmitterTester = ApiTester.emit("@azure-tools/typespec-azurite-emitter-pilot", {});

const FIXTURE_DIR = join(import.meta.dirname, "fixtures", "queue-pilot");

function readFixture(name: string): string {
  return readFileSync(join(FIXTURE_DIR, name), "utf-8");
}

/**
 * Loads the "queue-pilot" fixture (base service + azurite overlay) as a file map ready to
 * pass to a Tester's `compile`/`emit`. The synthetic `main.tsp` entry imports both the
 * unchanged base service definition and the azurite overlay, mirroring how a real
 * `tspconfig.yaml` entry point would combine them.
 */
export function loadQueuePilotFixture(): Record<string, string> {
  return {
    "main.tsp": `import "./base.tsp";\nimport "./azurite.tsp";\n`,
    "base.tsp": readFixture("base.tsp"),
    "azurite.tsp": readFixture("azurite.tsp"),
  };
}
