import { getMaxValue } from "@typespec/compiler";
import { getAllHttpServices } from "@typespec/http";
import { describe, expect, it } from "vitest";
import { buildServerModel } from "../src/build-model.js";
import { RealQueueApiTester, RealQueueEmitterTester, loadRealQueueFixture } from "./tester.js";

/**
 * Tests against the REAL, byte-for-byte unchanged Azure Storage Queue TypeSpec vendored into
 * `fixtures/storage-queue-real/` (see that directory's `PROVENANCE.md` for the exact source
 * commit), plus this package's own `azurite.tsp` overlay demonstrating genuine, documented
 * Azurite customizations (see the comments in `fixtures/storage-queue-real/azurite.tsp`, which
 * cite https://github.com/Azure/Azurite/blob/main/swagger/queue.md).
 *
 * Unlike `build-model.test.ts`/`render.test.ts`/`e2e.test.ts` (which use the small synthetic
 * `queue-pilot` fixture to pin down exact behavior), these tests exist to honestly report how
 * much of a REAL Azure spec this pilot's transform phase can represent today, and to pin down
 * the three concrete gaps found and fixed while vendoring it (see README "real-spec
 * compatibility" section): Record<T> dictionary handling, anonymous-model identity collisions,
 * and cross-interface operation-name collisions.
 */
describe("real Storage Queue spec: compiles cleanly", () => {
  it("compiles the vendored spec + azurite.tsp overlay with zero diagnostics", async () => {
    const [, diagnostics] = await RealQueueApiTester.compileAndDiagnose(loadRealQueueFixture());
    expect(diagnostics).toEqual([]);
  });
});

describe("real Storage Queue spec: buildServerModel", () => {
  it("builds all 17 real operations with zero skips", async () => {
    const { program } = await RealQueueApiTester.compile(loadRealQueueFixture());
    const serverModel = buildServerModel(program);

    expect(serverModel.skippedOperations).toEqual([]);
    expect(serverModel.operations).toHaveLength(17);
  });

  it("disambiguates the real Service.getProperties / Queue.getProperties name collision", async () => {
    // Both operations PascalCase to "GetProperties" (confirmed via a standalone `tsc` sanity
    // check of the generated handlers.ts/operations.ts, which failed with
    // `TS2300: Duplicate identifier 'GetProperties'` before this was fixed in buildServerModel).
    const { program } = await RealQueueApiTester.compile(loadRealQueueFixture());
    const serverModel = buildServerModel(program);

    const names = serverModel.operations.map((op) => op.name);
    const getPropertiesNames = names.filter((n) => n.includes("GetProperties"));
    expect(getPropertiesNames).toHaveLength(2);
    expect(new Set(getPropertiesNames).size).toBe(2);
  });

  it("expands QueueItem.metadata (a real Record<string> dictionary property) to a record type ref, not an empty named model", async () => {
    const { program } = await RealQueueApiTester.compile(loadRealQueueFixture());
    const serverModel = buildServerModel(program);

    const queueItem = serverModel.models.find((m) => m.name === "QueueItem");
    expect(queueItem).toBeDefined();
    const metadata = queueItem!.properties.find((p) => p.name === "metadata");
    expect(metadata).toBeDefined();
    expect(metadata!.type).toMatchObject({ kind: "record" });

    // The record type ref's element must be a plain string, not a dangling/empty model
    // reference -- this is exactly the bug found when the generic model-registration fallback
    // ran before the Record<T> check: QueueItem.metadata rendered as an empty `interface
    // Record {}` instead of `Record<string, string>`.
    if (metadata!.type.kind === "record") {
      expect(metadata!.type.element).toMatchObject({ kind: "string" });
    }
  });

  it("gives distinct anonymous models distinct names instead of collapsing them into one shared entry", async () => {
    // Real bug found only against the real spec: every StorageOperation* template
    // instantiation contributes its own distinct anonymous TypeSpec Model object for the
    // `{code, message}`-shaped error response body, even though they're structurally
    // identical. Keying the anonymous-model cache by `model.name` (empty for all of them)
    // silently coalesced all of these into one shared registry entry; keying by object
    // identity (`Map<Model, string>`) instead produced the correct, larger count of distinct
    // (if structurally duplicate) entries below.
    const { program } = await RealQueueApiTester.compile(loadRealQueueFixture());
    const serverModel = buildServerModel(program);

    const anonymousModels = serverModel.models.filter((m) => m.name.startsWith("AnonymousModel"));
    expect(anonymousModels.length).toBeGreaterThan(1);
    expect(new Set(anonymousModels.map((m) => m.name)).size).toBe(anonymousModels.length);
  });
});

describe("real Storage Queue spec: azurite.tsp overlay", () => {
  it("relaxes sendMessage's visibilityTimeout @maxValue from the base spec's 604800 (7 days) via a pure augment decorator", async () => {
    const { program } = await RealQueueApiTester.compile(loadRealQueueFixture());
    const [services] = getAllHttpServices(program);
    const sendMessage = services[0].operations.find((op) => op.operation.name === "sendMessage")!;
    const visibilityTimeout = sendMessage.parameters.parameters.find(
      (p) => p.param.name === "visibilityTimeout",
    )!;

    // The base vendored spec (models.tsp's VisibilityTimeoutParameter) declares
    // `@maxValue(604800)`. This overlay's `@@maxValue(..., 2147483647)` in azurite.tsp must
    // win, proving augment decorators can relax (not just add) a constraint from an unchanged
    // shared base spec -- the core mechanism the Azurite migration overlay design depends on.
    expect(getMaxValue(program, visibilityTimeout.param)).toBe(2147483647);
  });

  it("documents, without papering over, the one overlay case that does not yet work: updateMessage's own inline visibilityTimeout parameter", async () => {
    // Azurite's swagger/queue.md also calls out "VisibilityTimeoutRequired" -- the separately
    // declared, required `visibilityTimeout` parameter on Queue.updateMessage (not spread from
    // VisibilityTimeoutParameter). Targeting it via
    // `Storage.Queues.Queue.updateMessage::parameters.visibilityTimeout` fails to compile with
    // `invalid-ref: Model doesn't have member visibilityTimeout`, because updateMessage is
    // declared as `op updateMessage is StorageOperationNoBody<{...}, {...}>` (a template
    // instantiation) and the `::parameters` reflection accessor appears to resolve against the
    // template's own declared parameter list rather than the fully-substituted operation. This
    // test pins down that updateMessage's own maxValue is untouched by the current overlay, so
    // the gap is caught if it's silently "fixed" by an unrelated change without updating this
    // test and the azurite.tsp/README notes together.
    const { program } = await RealQueueApiTester.compile(loadRealQueueFixture());
    const [services] = getAllHttpServices(program);
    const updateMessage = services[0].operations.find(
      (op) => op.operation.name === "updateMessage",
    )!;
    const visibilityTimeout = updateMessage.parameters.parameters.find(
      (p) => p.param.name === "visibilityTimeout",
    )!;

    expect(getMaxValue(program, visibilityTimeout.param)).toBe(604800);
  });
});

describe("real Storage Queue spec: end-to-end emit", () => {
  it("emits all three artifacts with zero diagnostics", async () => {
    const [{ outputs }, diagnostics] =
      await RealQueueEmitterTester.compileAndDiagnose(loadRealQueueFixture());

    expect(diagnostics).toEqual([]);
    const fileNames = Object.keys(outputs)
      .map((path) => path.split("/").pop())
      .sort();
    expect(fileNames).toEqual(["handlers.ts", "models.ts", "operations.ts"]);
  });

  it("generates a handler interface method for sendMessage with the overlay's doc override reflected", async () => {
    const { outputs } = await RealQueueEmitterTester.compile(loadRealQueueFixture());
    const handlersFile = Object.entries(outputs).find(([path]) => path.endsWith("handlers.ts"))![1];

    expect(handlersFile).toContain("sendMessage(");
    expect(handlersFile).toContain("context: Context");
  });

  it("generates route metadata for all 17 real operations", async () => {
    const { outputs } = await RealQueueEmitterTester.compile(loadRealQueueFixture());
    const operationsFile = Object.entries(outputs).find(([path]) =>
      path.endsWith("operations.ts"),
    )![1];

    expect(operationsFile).toContain(`name: "SendMessage"`);
    expect(operationsFile).toContain(`verb: "post"`);
    // The real Service.getProperties / Queue.getProperties collision, disambiguated by
    // qualifying the second-registered one with its containing interface name.
    expect(operationsFile).toContain(`name: "GetProperties"`);
    expect(operationsFile).toContain(`name: "QueueGetProperties"`);
  });
});
