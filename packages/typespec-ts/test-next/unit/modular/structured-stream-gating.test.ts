// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { NodeHost, resolvePath, type EmitContext, type Program } from "@typespec/compiler";
import { expectDiagnosticEmpty } from "@typespec/compiler/testing";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { useContext } from "../../../src/context-manager.js";
import { useBinder } from "../../../src/framework/hooks/binder.js";
import { $onEmit } from "../../../src/index.js";
import type { EmitterOptions } from "../../../src/lib.js";
import { buildOperationOptions } from "../../../src/modular/build-operations.js";
import { getStructuredStreamKind } from "../../../src/modular/helpers/structured-stream-helpers.js";
import type { ServiceOperation } from "../../../src/utils/operation-util.js";
import {
  clearCompileCache,
  createDpgContextTestHelper,
  rlcEmitterFor,
} from "../../../test/util/test-util.js";

const packageRoot = fileURLToPath(new URL("../../../", import.meta.url));
const timeout = 60_000;
const eventSpec = `
  model Info { desc: string; }
  #suppress "@azure-tools/typespec-azure-core/union-enums-invalid-kind" "Event payloads are models, not enum values."
  @events
  union MessageEvents {
    @Events.contentType("application/json")
    Info,
  }
`;
const reconnectOptions = ["lastEventId", "retryDelayInMs", "maxRetries"];
const knownEmitterWarningMessages = new Set(
  ["generate-convenience-methods", "generate-protocol-methods"].map(
    (option) =>
      `The option "${option}" is only applicable to Java and C# emitters and has no effect for "@azure-tools/typespec-ts".`,
  ),
);

afterEach(() => clearCompileCache());

function operationWith({
  kind = "basic",
  contentTypes = ["text/event-stream"],
  streamTypeKind = "union",
  sse = true,
  stream = true,
}: {
  kind?: ServiceOperation["kind"];
  contentTypes?: string[] | null;
  streamTypeKind?: "model" | "union" | "string";
  sse?: boolean;
  stream?: boolean;
} = {}): ServiceOperation {
  return {
    kind,
    response: {
      streamMetadata: stream
        ? {
            contentTypes: contentTypes ?? undefined,
            streamType: { kind: streamTypeKind },
          }
        : undefined,
      sseMetadata: sse ? { events: [] } : undefined,
    },
  } as unknown as ServiceOperation;
}

describe("getStructuredStreamKind", () => {
  it("prefers SSE when both recognized MIME types are present", () => {
    expect(
      getStructuredStreamKind(
        operationWith({ contentTypes: ["application/jsonl", "text/event-stream"] }),
      ),
    ).toBe("sse");
  });

  it("preserves substring MIME matching", () => {
    expect(
      getStructuredStreamKind(
        operationWith({ contentTypes: ["text/event-stream; charset=utf-8"] }),
      ),
    ).toBe("sse");
    expect(
      getStructuredStreamKind(
        operationWith({ sse: false, contentTypes: ["application/jsonl; charset=utf-8"] }),
      ),
    ).toBe("jsonl");
  });

  it.each(["model", "union"] as const)("recognizes JSONL %s payloads", (streamTypeKind) => {
    expect(
      getStructuredStreamKind(
        operationWith({ contentTypes: ["application/jsonl"], streamTypeKind }),
      ),
    ).toBe("jsonl");
  });

  it.each([
    { stream: false },
    { sse: false },
    { contentTypes: [] },
    { contentTypes: null },
    { contentTypes: ["application/x-custom"] },
    { contentTypes: ["application/jsonl"], streamTypeKind: "string" as const },
  ])("rejects unsupported streaming metadata %j", (options) => {
    expect(getStructuredStreamKind(operationWith(options))).toBeUndefined();
  });

  it.each(["paging", "lro", "lropaging"] as const)(
    "does not classify %s operations as structured streams",
    (kind) => {
      expect(getStructuredStreamKind(operationWith({ kind }))).toBeUndefined();
      expect(
        getStructuredStreamKind(
          operationWith({ kind, sse: false, contentTypes: ["application/jsonl"] }),
        ),
      ).toBeUndefined();
    },
  );

  it("does not inspect payloads or mutate operation metadata", () => {
    const operation = operationWith();
    Object.defineProperty(operation.response.sseMetadata!, "events", {
      get() {
        throw new Error("Classification must not deserialize events or resolve their types");
      },
    });
    Object.freeze(operation.response.streamMetadata!.contentTypes);
    Object.freeze(operation.response.streamMetadata!.streamType);
    Object.freeze(operation.response.streamMetadata);
    Object.freeze(operation.response.sseMetadata);
    Object.freeze(operation.response);
    Object.freeze(operation);
    expect(getStructuredStreamKind(operation)).toBe("sse");
  });
});

/**
 * Exercise the real emitter and capture virtual writes, while reading helper assets from
 * the package itself. Partial operation emit helpers preload every static helper and cannot
 * verify package dependencies or pruning of unused helper files.
 */
async function emitModularFromTypeSpec(code: string): Promise<Record<string, string>> {
  const { program: compiledProgram } = await rlcEmitterFor(code);
  expectDiagnosticEmpty(compiledProgram.diagnostics);
  const emitterOutputDir = resolvePath(packageRoot, "test-output");
  const assetDir = resolvePath(packageRoot, "static");
  const outputs: Record<string, string> = {};
  const compilerHost = compiledProgram.host;
  const host: typeof compilerHost = {
    ...compilerHost,
    readFile: (path) =>
      path.startsWith(assetDir) ? NodeHost.readFile(path) : compilerHost.readFile(path),
    readDir: (path) =>
      path.startsWith(assetDir) ? NodeHost.readDir(path) : compilerHost.readDir(path),
    stat: (path) => (path.startsWith(assetDir) ? NodeHost.stat(path) : compilerHost.stat(path)),
    writeFile: async (path, content) => {
      outputs[relative(emitterOutputDir, path).replaceAll("\\", "/")] = content;
      await compilerHost.writeFile(path, content);
    },
  };
  const program: Program = {
    ...compiledProgram,
    host,
    compilerOptions: { ...compiledProgram.compilerOptions, noEmit: false },
    emitters: [
      {
        main: resolvePath(packageRoot, "dist/src/index.js"),
        metadata: { name: "@azure-tools/typespec-ts" },
      } as Program["emitters"][number],
    ],
  };
  const context = {
    program,
    emitterOutputDir,
    options: {},
    perf: {
      startTimer: () => ({ end: () => 0 }),
      time: (_, callback) => callback(),
      timeAsync: (_, callback) => callback(),
      report: () => {},
      measures: {},
    },
  } satisfies EmitContext;
  const options = {
    "package-details": { name: "@azure/structured-stream-test" },
    "generate-test": false,
    "generate-sample": false,
  } satisfies EmitterOptions;
  Object.assign(context.options, options);
  await $onEmit(context);
  // The emitter still supplies these two deprecated TCGC generation options itself.
  expectDiagnosticEmpty(
    program.diagnostics.filter(
      (diagnostic) =>
        !(
          diagnostic.severity === "warning" &&
          diagnostic.code ===
            "@azure-tools/typespec-client-generator-core/unnecessary-emitter-option" &&
          knownEmitterWarningMessages.has(diagnostic.message)
        ),
    ),
  );
  expect(outputs["package.json"]).toBeDefined();
  expect(outputs["src/api/options.ts"]).toBeDefined();
  expect(outputs["src/api/operations.ts"]).toBeDefined();
  return outputs;
}

function expectNoSse(files: Record<string, string>) {
  expect(JSON.parse(files["package.json"]!).dependencies).not.toHaveProperty("@azure/core-sse");
  expect(files).not.toHaveProperty("src/static-helpers/getSseResponse.ts");
  expect(files).not.toHaveProperty("src/static-helpers/sseStreamingHelpers.ts");
  expect(files["src/api/operations.ts"]).not.toContain("@azure/core-sse");
  expect(files["src/api/operations.ts"]).not.toContain("createReconnectingSseStream");
  for (const option of reconnectOptions) {
    expect(files["src/api/options.ts"]).not.toContain(`${option}?:`);
  }
}

describe("structured-stream generation gates", () => {
  it(
    "emits the dependency, helper files, and public reconnect options for genuine SSE",
    async () => {
      const files = await emitModularFromTypeSpec(`
        ${eventSpec}
        @route("/receive")
        op receive(): SSEStream<MessageEvents>;
      `);
      expect(JSON.parse(files["package.json"]!).dependencies).toHaveProperty("@azure/core-sse");
      expect(files).toHaveProperty("src/static-helpers/getSseResponse.ts");
      expect(files).toHaveProperty("src/static-helpers/sseStreamingHelpers.ts");
      expect(files).not.toHaveProperty("src/static-helpers/streamingHelpers.ts");
      expect(files["src/api/operations.ts"]).toContain("createReconnectingSseStream");
      expect(files["src/api/operations.ts"]).toContain("Promise<AsyncIterable<Info>>");
      for (const option of reconnectOptions) {
        expect(files["src/api/options.ts"]).toContain(`${option}?:`);
      }
    },
    timeout,
  );

  it.each([
    ["model", "JsonlStream<Info>", "Info"],
    ["event union", "JsonlStream<MessageEvents>", "MessageEvents"],
    [
      "custom recognized MIME",
      'Http.Streams.HttpStream<Info, "application/jsonl; charset=utf-8">',
      "Info",
    ],
  ])(
    "emits only JSONL helpers and no SSE options for %s",
    async (_, responseType, itemType) => {
      const files = await emitModularFromTypeSpec(`
        ${eventSpec}
        @route("/receive")
        op receive(): ${responseType};
      `);
      expectNoSse(files);
      expect(files).toHaveProperty("src/static-helpers/streamingHelpers.ts");
      expect(files["src/api/operations.ts"]).toContain("readJsonlStream");
      expect(files["src/api/operations.ts"]).toContain(`Promise<AsyncIterable<${itemType}>>`);
    },
    timeout,
  );

  it.each([
    [
      "custom HttpStream with SSE event metadata",
      'Http.Streams.HttpStream<MessageEvents, "custom/built-here">',
    ],
    ["primitive JSONL payload", "JsonlStream<string>"],
    ["plain response", "Info"],
  ])(
    "emits no structured-stream helpers or reconnect options for %s",
    async (_, responseType) => {
      const files = await emitModularFromTypeSpec(`
        ${eventSpec}
        @route("/receive")
        op receive(): ${responseType};
      `);
      expectNoSse(files);
      expect(files).not.toHaveProperty("src/static-helpers/streamingHelpers.ts");
      expect(files["src/api/operations.ts"]).not.toContain("AsyncIterable");
    },
    timeout,
  );

  it(
    "emits no SSE helpers for an event-stream HttpStream without event metadata",
    async () => {
      const files = await emitModularFromTypeSpec(`
        model Info { desc: string; }
        @route("/receive")
        op receive(): Http.Streams.HttpStream<Info, "text/event-stream">;
      `);
      expectNoSse(files);
      expect(files).not.toHaveProperty("src/static-helpers/streamingHelpers.ts");
      expect(files["src/api/operations.ts"]).not.toContain("AsyncIterable");
    },
    timeout,
  );

  it(
    "emits no structured-stream helpers for a custom stream without a MIME header",
    async () => {
      const files = await emitModularFromTypeSpec(`
        ${eventSpec}
        @TypeSpec.Streams.streamOf(MessageEvents)
        model CustomStream {
          @body body: bytes;
        }
        @route("/receive")
        op receive(): CustomStream;
      `);
      expectNoSse(files);
      expect(files).not.toHaveProperty("src/static-helpers/streamingHelpers.ts");
      expect(files["src/api/operations.ts"]).not.toContain("AsyncIterable");
    },
    timeout,
  );

  it(
    "does not add no-op reconnect options to paging, LRO, or LRO-paging methods",
    async () => {
      const { program } = await rlcEmitterFor(`
        ${eventSpec}
        @route("/receive")
        op receive(): SSEStream<MessageEvents>;
      `);
      const context = await createDpgContextTestHelper(program);
      const method = context.sdkPackage.clients[0]!.methods[0] as ServiceOperation;
      expect(getStructuredStreamKind(method)).toBe("sse");
      const project = useContext("outputProject");
      for (const kind of ["paging", "lro", "lropaging"] as const) {
        // Streaming and paging/LRO metadata do not currently coexist in TCGC output.
        // Retain a real SSE response to test the unsupported SDK method shapes directly.
        const operation = { ...method, kind } as ServiceOperation;
        const file = project.createSourceFile(`/${kind}/options.ts`);
        buildOperationOptions(context, [[], operation], file);
        for (const option of reconnectOptions) {
          expect(file.getFullText()).not.toContain(`${option}?:`);
        }
      }
      useBinder().resolveAllReferences("/");
      expectDiagnosticEmpty(program.diagnostics);
    },
    timeout,
  );
});
