import { resolvePath } from "@typespec/compiler";
import { createTester } from "@typespec/compiler/testing";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const ApiTester = createTester(resolvePath(import.meta.dirname, ".."), {
  libraries: ["@typespec/http", "@azure-tools/typespec-azurite-emitter-pilot"],
});

export const EmitterTester = ApiTester.emit("@azure-tools/typespec-azurite-emitter-pilot", {});

/**
 * A separate tester configured with the full set of libraries the real, vendored Azure Storage
 * Queue TypeSpec (`fixtures/storage-queue-real`) imports: `@typespec/rest`, `@typespec/xml`,
 * `@typespec/versioning`, `@typespec/openapi`, `@azure-tools/typespec-azure-core`, and
 * `@azure-tools/typespec-client-generator-core`. The toy `queue-pilot` fixture above doesn't
 * need any of these, so it keeps using the smaller `ApiTester`/`EmitterTester` above.
 */
export const RealQueueApiTester = createTester(resolvePath(import.meta.dirname, ".."), {
  libraries: [
    "@typespec/http",
    "@typespec/rest",
    "@typespec/xml",
    "@typespec/versioning",
    "@typespec/openapi",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-client-generator-core",
    "@azure-tools/typespec-azurite-emitter-pilot",
  ],
});

export const RealQueueEmitterTester = RealQueueApiTester.emit(
  "@azure-tools/typespec-azurite-emitter-pilot",
  {},
);

const FIXTURE_DIR = join(import.meta.dirname, "fixtures", "queue-pilot");
const REAL_QUEUE_FIXTURE_DIR = join(import.meta.dirname, "fixtures", "storage-queue-real");

function readRealQueueFixture(name: string): string {
  return readFileSync(join(REAL_QUEUE_FIXTURE_DIR, name), "utf-8");
}

/**
 * Loads the real, vendored Storage Queue TypeSpec (`main.tsp`/`models.tsp`/`routes.tsp`/
 * `client.tsp`, unchanged — see `PROVENANCE.md`) plus this fixture's own `azurite.tsp` overlay,
 * as a file map ready to pass to a Tester's `compile`/`emit`.
 */
export function loadRealQueueFixture(): Record<string, string> {
  return {
    // The vendored file is named `main.tsp` on disk (matching the real spec repo exactly — see
    // PROVENANCE.md). The testing harness requires its own entrypoint to be named `main.tsp`,
    // so it's remapped to `storage-queue-main.tsp` here and a synthetic `main.tsp` below layers
    // the azurite.tsp overlay on top, exactly like a real `tspconfig.yaml` entry point would
    // combine `import "@azure-storage/queue"` with a local `azurite.tsp`.
    "main.tsp": `import "./storage-queue-main.tsp";\nimport "./azurite.tsp";\n`,
    "storage-queue-main.tsp": readRealQueueFixture("main.tsp"),
    "models.tsp": readRealQueueFixture("models.tsp"),
    "routes.tsp": readRealQueueFixture("routes.tsp"),
    "client.tsp": readRealQueueFixture("client.tsp"),
    "azurite.tsp": readRealQueueFixture("azurite.tsp"),
  };
}

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
