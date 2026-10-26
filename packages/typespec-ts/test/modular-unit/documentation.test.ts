import { afterAll, assert, describe, it } from "vitest";
import { useContext } from "../../src/context-manager.js";
import { transformModularEmitterOptions } from "../../src/modular/build-modular-options.js";
import { buildRestorePoller } from "../../src/modular/build-restore-poller.js";
import { getClientHierarchyMap } from "../../src/utils/client-utils.js";
import {
  emitModularClientContextFromTypeSpec,
  emitModularClientFromTypeSpec,
  emitModularModelsFromTypeSpec,
  emitModularOperationsFromTypeSpec,
} from "../util/emit-util.js";
import { clearCompileCache, createDpgContextTestHelper, rlcEmitterFor } from "../util/test-util.js";

describe("Generated documentation", () => {
  afterAll(clearCompileCache);

  for (const type of [
    "decimal",
    "decimal128",
    "Amount",
    "decimal | null",
    "decimal | string",
    "decimal[]",
    "Record<decimal>",
  ]) {
    it(`documents required ${type} inputs on functions and client methods`, async () => {
      const tsp = `
        scalar Amount extends decimal;
        @doc("Updates the value.")
        @put op update(@doc("The value to store.") @body value: ${type}): void;
      `;
      const operations = await emitModularOperationsFromTypeSpec(tsp);
      const clients = await emitModularClientFromTypeSpec(tsp);
      for (const declaration of [
        operations![0]!.getFunctionOrThrow("update"),
        clients[0]!.getClasses()[0]!.getMethodOrThrow("update"),
      ]) {
        const docs = declaration
          .getJsDocs()
          .map((doc) => doc.getText())
          .join("\n");
        assert.include(docs, "Updates the value.");
        assert.include(docs, "@param value - The value to store.");
        assert.include(docs, "IEEE 754");
        assert.include(docs, "0.1 + 0.2 !== 0.3");
        assert.include(docs, "integer math");
        assert.include(docs, "`decimal.js`");
      }
    });
  }

  it("documents optional decimal inputs on options interfaces", async () => {
    const models = await emitModularModelsFromTypeSpec(
      `@put op update(@doc("The value to store.") @body value?: decimal128): void;`,
      { needOptions: true },
    );
    const docs = models!
      .getInterfaceOrThrow("UpdateOptionalParams")
      .getPropertyOrThrow("value")
      .getJsDocs()
      .map((doc: { getText(): string }) => doc.getText())
      .join("\n");
    assert.include(docs, "The value to store.");
    assert.include(docs, "IEEE 754");
  });

  it("documents decimal properties of input models but not output-only models", async () => {
    const models = await emitModularModelsFromTypeSpec(`
      model Input { @doc("The amount.") value: decimal; }
      model Output { value: decimal128; }
      @put op update(@body input: Input): Output;
    `);
    assert.include(models!.getInterfaceOrThrow("Input").getFullText(), "IEEE 754");
    assert.notInclude(models!.getInterfaceOrThrow("Output").getFullText(), "IEEE 754");
  });

  for (const header of ["If-Match", "If-None-Match", "If-Modified-Since", "iF-uNmOdIfIeD-sInCe"]) {
    it(`documents the ${header} wire header on functions and operation interfaces`, async () => {
      const clients = await emitModularClientFromTypeSpec(`
        interface Items {
          @doc("Reads the item.")
          @get read(@header("${header}") condition?: string): void;
        }
      `);
      const project = clients[0]!.getProject();
      const operation = project
        .getSourceFiles()
        .flatMap((file) => file.getFunctions())
        .find((fn) => fn.getName() === "read")!;
      const group = project
        .getSourceFiles()
        .flatMap((file) => file.getInterfaces())
        .find((iface) => iface.getName() === "ItemsOperations")!;
      for (const docs of [
        operation.getFullText(),
        group.getPropertyOrThrow("read").getFullText(),
      ]) {
        assert.include(docs, "Reads the item.");
        assert.include(docs, "`412 Precondition Failed`");
        assert.include(docs, "`304 Not Modified`");
        assert.include(docs, "does not automatically retry or resolve conflicts");
      }
    });
  }

  it("does not warn about unrelated inputs or conditional response headers", async () => {
    const operations = await emitModularOperationsFromTypeSpec(`
      @get op read(@query value: float64, @header("x-if-match") condition?: string): {
        @header("If-Match") etag: string;
        @body value: decimal;
      };
    `);
    const docs = operations![0]!
      .getFunctionOrThrow("read")
      .getJsDocs()
      .map((doc) => doc.getText())
      .join("\n");
    assert.notInclude(docs, "IEEE 754");
    assert.notInclude(docs, "Precondition Failed");
  });

  it("documents encoded decimal inputs that are still represented as numbers", async () => {
    const operations = await emitModularOperationsFromTypeSpec(`
      @encode("string") scalar ExactAmount extends decimal128;
      @put op update(@body value: ExactAmount): void;
    `);
    const operation = operations![0]!.getFunctionOrThrow("update");
    assert.equal(operation.getParameterOrThrow("value").getTypeNodeOrThrow().getText(), "number");
    assert.include(operation.getFullText(), "IEEE 754");
  });

  it("does not confuse optional decimal inputs with the synthetic options parameter", async () => {
    const tsp = `@get op read(@query options?: decimal): void;`;
    const operations = await emitModularOperationsFromTypeSpec(tsp);
    const clients = await emitModularClientFromTypeSpec(tsp);
    for (const declaration of [
      operations![0]!.getFunctionOrThrow("read"),
      clients[0]!.getClasses()[0]!.getMethodOrThrow("read"),
    ]) {
      assert.notInclude(declaration.getFullText(), "@param options - A decimal number.");
    }
    const models = await emitModularModelsFromTypeSpec(tsp, { needOptions: true });
    assert.include(
      models!.getInterfaceOrThrow("ReadOptionalParams").getPropertyOrThrow("options").getFullText(),
      "IEEE 754",
    );
  });

  it("preserves service documentation on the public client class", async () => {
    const clients = await emitModularClientFromTypeSpec(
      `
      import "@typespec/http";
      using TypeSpec.Http;
      @service
      @doc("Manages stored items.")
      namespace Storage;
      @get op read(): void;
    `,
      { withRawContent: true },
    );
    assert.include(clients[0]!.getClasses()[0]!.getJsDocs()[0]!.getText(), "Manages stored items.");
  });

  it("provides client, constructor, context, and factory summaries without service docs", async () => {
    const tsp = `@get op read(): void;`;
    const clients = await emitModularClientFromTypeSpec(tsp);
    const client = clients[0]!.getClasses()[0]!;
    assert.include(client.getJsDocs()[0]!.getText(), "Client for TestingClient.");
    assert.include(
      client.getConstructors()[0]!.getJsDocs()[0]!.getText(),
      "Creates an instance of TestingClient.",
    );
    const context = await emitModularClientContextFromTypeSpec(tsp);
    assert.include(
      context!.getInterfaceOrThrow("TestingContext").getJsDocs()[0]!.getText(),
      "The client context for Testing.",
    );
    assert.include(
      context!.getFunctionOrThrow("createTesting").getJsDocs()[0]!.getText(),
      "Creates a Testing client context.",
    );
  });

  it("documents nested operation-group properties", async () => {
    const clients = await emitModularClientFromTypeSpec(`
      namespace Items {
        interface Versions { @get read(): void; }
      }
    `);
    const groups = clients[0]!
      .getProject()
      .getSourceFiles()
      .flatMap((file) => file.getInterfaces());
    const group = groups.find((iface) => iface.getName() === "ItemsOperations")!;
    assert.include(
      group.getPropertyOrThrow("versions").getJsDocs()[0]!.getText(),
      "The versions operation group.",
    );
  });

  it("documents poller restoration options", async () => {
    const compiled = await rlcEmitterFor(
      `
      model Result { value: string; }
      @route("/run")
      op run is Azure.Core.LongRunningRpcOperation<{}, Result>;
    `,
      { needAzureCore: true },
    );
    const context = await createDpgContextTestHelper(compiled.program);
    const clientMap = Array.from(getClientHierarchyMap(context))[0]!;
    buildRestorePoller(
      context,
      clientMap,
      transformModularEmitterOptions(context, "", { casing: "camel" }),
    );
    const helper = useContext("outputProject")
      .getSourceFiles()
      .find((file) => file.getBaseName() === "restorePollerHelpers.ts")!;
    assert.include(
      helper.getInterfaceOrThrow("RestorePollerOptions").getJsDocs()[0]!.getText(),
      "Options for restoring a long-running operation poller.",
    );
  });
});
