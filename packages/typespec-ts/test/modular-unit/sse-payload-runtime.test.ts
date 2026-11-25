import { Readable } from "node:stream";
import { Project, type SourceFile, SyntaxKind } from "ts-morph";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { clearContexts, useContext } from "../../src/context-manager.js";
import { emitModularOperationsFromTypeSpec } from "../util/emit-util.js";
import { createGeneratedRuntime } from "../util/generated-runtime.js";
import { clearCompileCache } from "../util/test-util.js";

interface EventPayload {
  event: string;
  data: string | number | boolean | Date | Uint8Array | { value: string };
}

interface GeneratedOperations {
  receive(
    context: unknown,
    options?: { abortSignal?: AbortSignal; requestOptions?: { headers?: Record<string, string> } },
  ): Promise<AsyncIterable<EventPayload>>;
  receiveXml(context: unknown): Promise<AsyncIterable<EventPayload>>;
  receiveJsonTerminal(context: unknown): Promise<AsyncIterable<EventPayload>>;
  receiveMessageTerminal(context: unknown): Promise<AsyncIterable<EventPayload>>;
  receiveUnnamedTerminal(context: unknown): Promise<AsyncIterable<string | { value: string }>>;
  receiveModelTerminal(context: unknown): Promise<AsyncIterable<EventPayload>>;
  receiveNumericTerminal(context: unknown): Promise<AsyncIterable<EventPayload>>;
  receiveBooleanTerminal(context: unknown): Promise<AsyncIterable<EventPayload>>;
  receiveOnlyTerminal(context: unknown): Promise<AsyncIterable<"[DONE]">>;
  receiveScalars(context: unknown): Promise<AsyncIterable<EventPayload>>;
  receiveScalarTerminal(context: unknown): Promise<AsyncIterable<EventPayload>>;
  receiveUnnamedScalar(context: unknown): Promise<AsyncIterable<number>>;
  receiveConstants(context: unknown): Promise<AsyncIterable<"cat" | "dog" | "[DONE]">>;
  receiveUnannotatedConstants(context: unknown): Promise<AsyncIterable<"cat" | "dog">>;
  receiveJsonConstants(context: unknown): Promise<AsyncIterable<"cat" | "dog">>;
  receiveNumericConstants(context: unknown): Promise<AsyncIterable<1 | 2>>;
  receiveBooleanConstants(context: unknown): Promise<AsyncIterable<true | false>>;
  receivePrimitiveConstants(context: unknown): Promise<AsyncIterable<1 | 2 | false>>;
  receiveMixedFormatConstants(context: unknown): Promise<AsyncIterable<"cat" | "dog">>;
  receiveConstantsAndModels(
    context: unknown,
  ): Promise<AsyncIterable<"cat" | "dog" | { value: string }>>;
  receiveConstantsAndTerminalModel(
    context: unknown,
  ): Promise<AsyncIterable<"cat" | "dog" | { value: string }>>;
  receiveNamedConstants(context: unknown): Promise<AsyncIterable<EventPayload>>;
  receiveOptional(context: unknown): Promise<AsyncIterable<EventPayload>>;
}

describe("generated SSE payload formats", () => {
  let operations: GeneratedOperations;
  let browserOperations: GeneratedOperations;
  let reactNativeOperations: GeneratedOperations;
  let payloadContentTypes: (string | undefined)[] | undefined;
  let operationsFile: SourceFile;

  beforeAll(async () => {
    const files = await emitModularOperationsFromTypeSpec(
      `
      @mediaTypeHint("application/json")
      scalar JsonText extends string;
      model Payload {
        @encodedName("application/json", "wire_value")
        value: string;
      }
      @events
      union PayloadEvents {
        progress: string,
        object: Payload,
        @Events.contentType("application/json")
        quoted: string,
        hinted: JsonText,
        @Events.contentType("text/plain")
        explicit: JsonText,
        @Events.contentType("application/json")
        scalarEnvelope: { @data contents: string },
        @Events.contentType("text/plain")
        modelEnvelope: { @data contents: Payload },
        @Events.contentType("text/plain")
        propertyOverride: { @data @Events.contentType("application/json") contents: string },
        @terminalEvent
        "[DONE]",
      }
      @route("receive")
      op receive(): SSEStream<PayloadEvents> | ApiError;

      @error
      model ApiError {
        code: string;
        @encodedName("application/json", "wire_message") message: string;
        @header("x-ms-error-code") errorCode: string;
      }

      @error
      @mediaTypeHint("application/xml")
      model StorageError {
        @Xml.name("Code") code?: string;
        @Xml.name("Message") message?: string;
        @header("x-ms-error-code") errorCode: string;
      }

      @route("receiveXml")
      op receiveXml(): SSEStream<PayloadEvents> | StorageError;

      @events
      union JsonTerminalEvents {
        @Events.contentType("application/json")
        @terminalEvent
        complete: "finished",
      }
      @route("receiveJsonTerminal")
      op receiveJsonTerminal(): SSEStream<JsonTerminalEvents>;

      @events
      union MessageTerminalEvents {
        message: Payload,
        @terminalEvent
        "[DONE]",
      }
      @route("receiveMessageTerminal")
      op receiveMessageTerminal(): SSEStream<MessageTerminalEvents>;

      @events
      union UnnamedTerminalEvents {
        Payload,
        @terminalEvent
        "[DONE]",
      }
      @route("receiveUnnamedTerminal")
      op receiveUnnamedTerminal(): SSEStream<UnnamedTerminalEvents>;

      @events
      union ModelTerminalEvents { @terminalEvent complete: Payload }
      @route("receiveModelTerminal")
      op receiveModelTerminal(): SSEStream<ModelTerminalEvents>;

      @events
      union NumericTerminalEvents { @terminalEvent complete: 42 }
      @route("receiveNumericTerminal")
      op receiveNumericTerminal(): SSEStream<NumericTerminalEvents>;

      @events
      union BooleanTerminalEvents { @terminalEvent complete: false }
      @route("receiveBooleanTerminal")
      op receiveBooleanTerminal(): SSEStream<BooleanTerminalEvents>;

      @events
      union OnlyTerminalEvents { @terminalEvent "[DONE]" }
      @route("receiveOnlyTerminal")
      op receiveOnlyTerminal(): SSEStream<OnlyTerminalEvents>;

      @mediaTypeHint("application/json")
      scalar JsonInt extends int32;
      @encode(string)
      scalar StringInt extends int32;
      @encode("unixTimestamp", int64)
      scalar UnixTime extends utcDateTime;
      @encode("base64url")
      scalar UrlBytes extends bytes;
      @encode("seconds", float64)
      scalar Seconds extends duration;
      enum NumericChoice { one: 1, two: 2 }

      @events
      union ScalarEvents {
        progress: int32,
        ratio: float64,
        flag: boolean,
        @Events.contentType("text/plain")
        explicit: int32,
        @Events.contentType("application/json")
        jsonFlag: boolean,
        hinted: JsonInt,
        @Events.contentType("application/json")
        encoded: StringInt,
        @Events.contentType("text/plain")
        choice: NumericChoice,
        envelope: { @data contents: int32 },
        timestamp: utcDateTime,
        unix: UnixTime,
        day: plainDate,
        binary: bytes,
        urlBinary: UrlBytes,
        duration: Seconds,
      }
      @route("receiveScalars")
      op receiveScalars(): SSEStream<ScalarEvents>;

      @events
      union ScalarTerminalEvents { @terminalEvent complete: boolean }
      @route("receiveScalarTerminal")
      op receiveScalarTerminal(): SSEStream<ScalarTerminalEvents>;

      @events
      union UnnamedScalarEvents { int32 }
      @route("receiveUnnamedScalar")
      op receiveUnnamedScalar(): SSEStream<UnnamedScalarEvents>;

      @events
      union ConstantEvents {
        @Events.contentType("text/plain")
        "cat",
        @Events.contentType("text/plain")
        "dog",
        @terminalEvent
        "[DONE]",
      }
      @route("receiveConstants")
      op receiveConstants(): SSEStream<ConstantEvents>;

      @events
      union UnannotatedConstantEvents { "cat", "dog" }
      @route("receiveUnannotatedConstants")
      op receiveUnannotatedConstants(): SSEStream<UnannotatedConstantEvents>;

      @events
      union JsonConstantEvents {
        @Events.contentType("application/json")
        "cat",
        @Events.contentType("application/json")
        "dog",
      }
      @route("receiveJsonConstants")
      op receiveJsonConstants(): SSEStream<JsonConstantEvents>;

      @events
      union NumericConstantEvents { 1, 2 }
      @route("receiveNumericConstants")
      op receiveNumericConstants(): SSEStream<NumericConstantEvents>;

      @events
      union BooleanConstantEvents {
        @Events.contentType("application/json")
        true,
        @Events.contentType("application/json")
        false,
      }
      @route("receiveBooleanConstants")
      op receiveBooleanConstants(): SSEStream<BooleanConstantEvents>;

      @events
      union PrimitiveConstantEvents {
        @Events.contentType("text/plain")
        1,
        @Events.contentType("text/plain")
        2,
        @Events.contentType("application/json")
        false,
      }
      @route("receivePrimitiveConstants")
      op receivePrimitiveConstants(): SSEStream<PrimitiveConstantEvents>;

      @events
      union MixedFormatConstantEvents {
        @Events.contentType("text/plain")
        "cat",
        @Events.contentType("application/json")
        "dog",
      }
      @route("receiveMixedFormatConstants")
      op receiveMixedFormatConstants(): SSEStream<MixedFormatConstantEvents>;

      @events
      union ConstantsAndModels {
        @Events.contentType("text/plain")
        "cat",
        @Events.contentType("text/plain")
        "dog",
        Payload,
      }
      @route("receiveConstantsAndModels")
      op receiveConstantsAndModels(): SSEStream<ConstantsAndModels>;

      @events
      union ConstantsAndTerminalModel {
        @Events.contentType("text/plain")
        "cat",
        @Events.contentType("text/plain")
        "dog",
        @terminalEvent
        Payload,
      }
      @route("receiveConstantsAndTerminalModel")
      op receiveConstantsAndTerminalModel(): SSEStream<ConstantsAndTerminalModel>;

      @events
      union NamedConstantEvents {
        @Events.contentType("text/plain")
        first: "cat",
        @Events.contentType("text/plain")
        second: "dog",
      }
      @route("receiveNamedConstants")
      op receiveNamedConstants(): SSEStream<NamedConstantEvents>;

      model AcceptedWithoutBody {
        @statusCode status: 202;
      }
      @route("receiveOptional")
      op receiveOptional(): SSEStream<MessageTerminalEvents> | NoContentResponse | AcceptedWithoutBody | ApiError;
    `,
      { "include-headers-in-response": true, needTCGC: true },
    );
    expect(files).toHaveLength(1);
    for (const method of useContext("emitContext").tcgcContext.sdkPackage.clients[0].methods) {
      if (method.kind === "basic" && method.name === "receive") {
        payloadContentTypes = method.response.sseMetadata?.events.map(
          (event) => event.payloadContentType,
        );
      }
    }
    const file = files![0]!;
    operationsFile = file;
    const sources = file
      .getProject()
      .getSourceFiles()
      .map((source) => [source.getFilePath(), source.getFullText()] as const);
    operations = createGeneratedRuntime(sources).loadModule<GeneratedOperations>(
      file.getFilePath(),
    );
    browserOperations = createGeneratedRuntime(sources, {
      platform: "browser",
    }).loadModule<GeneratedOperations>(file.getFilePath());
    reactNativeOperations = createGeneratedRuntime(sources, {
      platform: "react-native",
    }).loadModule<GeneratedOperations>(file.getFilePath());
  });

  afterAll(() => {
    clearCompileCache();
    clearContexts();
  });

  function transport(
    platform: "Node" | "browser",
    source: string,
    status = "200",
    headers: Record<string, string> = { "content-type": "text/event-stream" },
    keepOpen = false,
  ) {
    const bytes = new TextEncoder().encode(source);
    const cancel = vi.fn();
    const nodeBody = new Readable({ read() {} });
    const body =
      platform === "Node"
        ? nodeBody
        : new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(bytes);
              if (!keepOpen) {
                controller.close();
              }
            },
            cancel,
          });
    if (platform === "Node") {
      nodeBody.push(bytes);
      if (!keepOpen) {
        nodeBody.push(null);
      }
    }
    const send = vi.fn().mockResolvedValue({ status, headers, body });
    const get = vi.fn(
      (_options: { abortSignal?: AbortSignal; headers: Record<string, string> }) => ({
        asNodeStream: send,
        asBrowserStream: send,
      }),
    );
    return { context: { path: vi.fn(() => ({ get })) }, get, send, body, nodeBody, cancel };
  }

  async function collect(source: AsyncIterable<EventPayload>): Promise<EventPayload[]> {
    const result: EventPayload[] = [];
    for await (const item of source) {
      result.push(item);
    }
    return result;
  }

  it.each([
    ["receiveConstants", "dog", "cat", ["dog", "cat"]],
    ["receiveUnannotatedConstants", "dog", "cat", ["dog", "cat"]],
    ["receiveJsonConstants", '"dog"', '"cat"', ["dog", "cat"]],
    ["receiveNumericConstants", "2", "1", [2, 1]],
    ["receiveBooleanConstants", "false", "true", [false, true]],
  ] as const)(
    "uses the primitive decoder for homogeneous nonterminal constants in %s",
    async (operation, first, second, expected) => {
      const fixture = transport("Node", `data: ${first}\n\ndata: ${second}\n\n`);
      const values = [];
      for await (const item of await operations[operation](fixture.context)) {
        values.push(item);
      }
      expect(values).toEqual(expected);
    },
  );

  it.each([
    ["receiveConstants", 1, "data", '"cat" | "dog" | "[DONE]"'],
    ["receiveUnannotatedConstants", 0, "data", '"cat" | "dog"'],
    ["receiveJsonConstants", 0, "data", '"cat" | "dog"'],
    ["receiveNumericConstants", 0, "(Number(data)) as 1 | 2", "1 | 2"],
    [
      "receiveBooleanConstants",
      0,
      '(String(data).trim().toLowerCase() === "true") as true | false',
      "true | false",
    ],
  ] as const)(
    "generates one shared nonterminal decoder for %s",
    (operation, matchers, expression, type) => {
      const source = operationsFile.getFunctionOrThrow(operation).getText().replace(/\s+/g, " ");
      expect(source.match(/isTerminal: false/g)).toHaveLength(1);
      expect(source.match(/terminalValue:/g) ?? []).toHaveLength(matchers);
      expect(source).toContain(`deserialize: (data) => ${expression}`);
      expect(source).toContain(`Promise<AsyncIterable<${type}>>`);
    },
  );

  it("type-checks shared constant descriptors against their declared literal unions", () => {
    const project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: { strict: true },
    });
    const descriptor = operationsFile
      .getProject()
      .getSourceFiles()
      .flatMap((file) => file.getInterfaces())
      .find((type) => type.getName() === "SseEventDescriptor");
    if (!descriptor) {
      throw new Error("SseEventDescriptor was not emitted.");
    }
    const declarations = [
      "receiveConstants",
      "receiveUnannotatedConstants",
      "receiveJsonConstants",
      "receiveNumericConstants",
      "receiveBooleanConstants",
    ].map((operation) => {
      const declaration = operationsFile
        .getFunctionOrThrow(operation)
        .getDescendantsOfKind(SyntaxKind.VariableDeclaration)
        .find((declaration) => declaration.getName() === "descriptors");
      if (!declaration) {
        throw new Error(`SSE descriptors were not emitted for ${operation}.`);
      }
      return `{ const ${declaration.getText()}; }`;
    });
    project.createSourceFile(
      "constant-descriptors.ts",
      `${descriptor.getText()}\n${declarations.join("\n")}`,
    );
    expect(
      project.getPreEmitDiagnostics().map((diagnostic) => diagnostic.getMessageText()),
    ).toEqual([]);
  });

  it("does not replace an actual string payload with a declared nonterminal constant", async () => {
    const fixture = transport("Node", "data: actual-wire-value\n\n");
    const values = [];
    for await (const item of await operations.receiveConstants(fixture.context)) {
      values.push(item);
    }
    expect(values).toEqual(["actual-wire-value"]);
  });

  it("preserves malformed JSON errors with the shared primitive decoder", async () => {
    const fixture = transport("Node", "data: {invalid\n\n");
    const stream = await operations.receiveJsonConstants(fixture.context);
    await expect(stream[Symbol.asyncIterator]().next()).rejects.toThrow(
      'Unable to deserialize event "message".',
    );
  });

  it("retains value matching when unnamed constants need different primitive decoding", async () => {
    const fixture = transport("Node", "data: 3\n\ndata: 2\n\ndata: false\n\n");
    const values = [];
    for await (const item of await operations.receivePrimitiveConstants(fixture.context)) {
      values.push(item);
    }
    expect(values).toEqual([2, false]);
  });

  it("retains value matching when unnamed constants use different wire formats", async () => {
    const fixture = transport("Node", 'data: cat\n\ndata: "dog"\n\n');
    const values = [];
    for await (const item of await operations.receiveMixedFormatConstants(fixture.context)) {
      values.push(item);
    }
    expect(values).toEqual(["cat", "dog"]);
  });

  it("preserves model selection when unnamed constants compete with a model", async () => {
    const fixture = transport("Node", 'data: dog\n\ndata: {"wire_value":"model"}\n\ndata: cat\n\n');
    const values = [];
    for await (const item of await operations.receiveConstantsAndModels(fixture.context)) {
      values.push(item);
    }
    expect(values).toEqual(["dog", { value: "model" }, "cat"]);
  });

  it("preserves an unnamed terminal model alongside nonterminal constants", async () => {
    const fixture = transport("Node", 'data: dog\n\ndata: {"wire_value":"final"}\n\ndata: cat\n\n');
    const values = [];
    for await (const item of await operations.receiveConstantsAndTerminalModel(fixture.context)) {
      values.push(item);
    }
    expect(values).toEqual(["dog", { value: "final" }]);
    expect(fixture.nodeBody.destroyed).toBe(true);
  });

  it("closes the source before yielding a terminal after shared constant decoding", async () => {
    const fixture = transport(
      "Node",
      "data: dog\n\ndata: cat\n\ndata: [DONE]\n\ndata: dog\n\n",
      "200",
      undefined,
      true,
    );
    const stream = await operations.receiveConstants(fixture.context);
    const iterator = stream[Symbol.asyncIterator]();
    expect(await iterator.next()).toEqual({ done: false, value: "dog" });
    expect(await iterator.next()).toEqual({ done: false, value: "cat" });
    expect(await iterator.next()).toEqual({ done: false, value: "[DONE]" });
    expect(fixture.nodeBody.destroyed).toBe(true);
    expect(await iterator.next()).toEqual({ done: true, value: undefined });
  });

  it("matches a named nonterminal constant by both event name and payload", async () => {
    const fixture = transport(
      "Node",
      "event: first\ndata: dog\n\nevent: second\ndata: dog\n\nevent: first\ndata: cat\n\n",
    );
    expect(await collect(await operations.receiveNamedConstants(fixture.context))).toEqual([
      { event: "second", data: "dog" },
      { event: "first", data: "cat" },
    ]);
  });

  it.each(
    (["Node", "browser", "react-native"] as const).flatMap((platform) =>
      ["202", "204"].flatMap((status) =>
        [false, true].map((hasBody) => ({ platform, status, hasBody })),
      ),
    ),
  )("accepts a declared no-content response as an empty iterable: %j", async (testCase) => {
    const { platform, status, hasBody } = testCase;
    const fixture = transport(platform === "Node" ? "Node" : "browser", "", status, {}, hasBody);
    fixture.send.mockResolvedValueOnce({
      status,
      headers: {},
      body: hasBody ? fixture.body : undefined,
    });
    const runtime =
      platform === "Node"
        ? operations
        : platform === "browser"
          ? browserOperations
          : reactNativeOperations;

    const stream = await runtime.receiveOptional(fixture.context);
    expect(await collect(stream)).toEqual([]);
    expect(fixture.send).toHaveBeenCalledOnce();
    if (hasBody) {
      if (platform === "Node") {
        expect(fixture.nodeBody.destroyed).toBe(true);
      } else {
        expect(fixture.cancel).toHaveBeenCalledOnce();
        expect(fixture.body).toHaveProperty("locked", false);
      }
    }
  });

  it.each(["Node", "browser"] as const)(
    "still rejects a missing streaming body on %s when only other statuses are bodyless",
    async (platform) => {
      const fixture = transport(platform, "", "200", {});
      fixture.send.mockResolvedValueOnce({
        status: "200",
        headers: { "content-type": "text/event-stream" },
        body: undefined,
      });
      const runtime = platform === "Node" ? operations : browserOperations;

      await expect(runtime.receiveOptional(fixture.context)).rejects.toMatchObject({
        statusCode: 200,
      });
    },
  );

  it("preserves cleanup failures for a declared no-content response", async () => {
    const failure = new Error("no-content body cancellation failed");
    const body = new ReadableStream<Uint8Array>({
      cancel() {
        throw failure;
      },
    });
    const send = vi.fn().mockResolvedValue({ status: "204", headers: {}, body });

    await expect(
      browserOperations.receiveOptional({
        path: () => ({ get: () => ({ asBrowserStream: send }) }),
      }),
    ).rejects.toBe(failure);
  });

  it("preserves the streaming branch of an operation with a no-content alternative", async () => {
    const fixture = transport("Node", 'event: message\ndata: {"wire_value":"streamed"}\n\n');
    expect(await collect(await operations.receiveOptional(fixture.context))).toEqual([
      { event: "message", data: { value: "streamed" } },
    ]);
  });

  it("infers payload formats without modifying TCGC's explicit SSE metadata", () => {
    expect(payloadContentTypes).toEqual([
      undefined,
      undefined,
      "application/json",
      undefined,
      "text/plain",
      undefined,
      undefined,
      "application/json",
      undefined,
    ]);
  });

  it.each(["Node", "browser", "react-native"] as const)(
    "decodes real scalar types and encodings on %s without changing payload MIME",
    async (platform) => {
      const frames = [
        ["progress", "42"],
        ["ratio", "1.25"],
        ["flag", "false"],
        ["explicit", "-7"],
        ["jsonFlag", "true"],
        ["jsonFlag", "false"],
        ["hinted", "17"],
        ["encoded", '"64"'],
        ["choice", "2"],
        ["envelope", "9"],
        ["timestamp", "2024-01-02T03:04:05Z"],
        ["unix", "1704164645"],
        ["day", "2024-01-02"],
        ["binary", "SGVsbG8="],
        ["urlBinary", "-_8"],
        ["duration", "1.5"],
      ]
        .map(([event, data]) => `event: ${event}\ndata: ${data}\n\n`)
        .join("");
      const fixture = transport(platform === "Node" ? "Node" : "browser", frames);
      const runtime =
        platform === "Node"
          ? operations
          : platform === "browser"
            ? browserOperations
            : reactNativeOperations;
      const items = await collect(await runtime.receiveScalars(fixture.context));
      expect(items).toEqual([
        { event: "progress", data: 42 },
        { event: "ratio", data: 1.25 },
        { event: "flag", data: false },
        { event: "explicit", data: -7 },
        { event: "jsonFlag", data: true },
        { event: "jsonFlag", data: false },
        { event: "hinted", data: 17 },
        { event: "encoded", data: 64 },
        { event: "choice", data: 2 },
        { event: "envelope", data: 9 },
        { event: "timestamp", data: new Date("2024-01-02T03:04:05Z") },
        { event: "unix", data: new Date("2024-01-02T03:04:05Z") },
        { event: "day", data: new Date("2024-01-02") },
        { event: "binary", data: expect.any(Uint8Array) },
        { event: "urlBinary", data: expect.any(Uint8Array) },
        { event: "duration", data: 1.5 },
      ]);
      expect(
        items.flatMap((item) =>
          item.data instanceof Uint8Array ? [{ event: item.event, bytes: [...item.data] }] : [],
        ),
      ).toEqual([
        { event: "binary", bytes: [72, 101, 108, 108, 111] },
        { event: "urlBinary", bytes: [251, 255] },
      ]);
    },
  );

  it("yields a scalar boolean terminal before stopping, not a literal constant", async () => {
    const fixture = transport(
      "Node",
      "event: complete\ndata: false\n\nevent: complete\ndata: true\n\n",
      "200",
      undefined,
      true,
    );
    expect(await collect(await operations.receiveScalarTerminal(fixture.context))).toEqual([
      { event: "complete", data: false },
    ]);
    expect(fixture.nodeBody.destroyed).toBe(true);
  });

  it("decodes unnamed scalar payloads without adding an event envelope", async () => {
    const fixture = transport("Node", "data: 0\n\ndata: -42\n\n");
    const values: number[] = [];
    for await (const value of await operations.receiveUnnamedScalar(fixture.context)) {
      values.push(value);
    }
    expect(values).toEqual([0, -42]);
  });

  it.each([
    ["progress", "not-a-number", NaN],
    ["progress", "", 0],
    ["progress", "1e999", Infinity],
    ["flag", "not-a-boolean", false],
  ])("matches response-header coercion for %s payload %j", async (event, data, expected) => {
    const fixture = transport("Node", `event: ${event}\ndata: ${data}\n\n`, "200", undefined, true);
    const iterator = (await operations.receiveScalars(fixture.context))[Symbol.asyncIterator]();
    try {
      await expect(iterator.next()).resolves.toEqual({
        done: false,
        value: { event, data: expected },
      });
    } finally {
      await iterator.return?.();
    }
    expect(fixture.nodeBody.destroyed).toBe(true);
  });

  it("decodes inferred, explicit, hinted and @data payload-only wire formats through real core", async () => {
    const frames = [
      "event: progress\ndata: hello\n\n",
      'event: object\ndata: {"wire_value":"model"}\n\n',
      'event: quoted\ndata: "quoted scalar"\n\n',
      'event: hinted\ndata: "hinted scalar"\n\n',
      "event: explicit\ndata: explicit text\n\n",
      "event: scalarEnvelope\ndata: payload only\n\n",
      'event: modelEnvelope\ndata: {"wire_value":"wrapped model"}\n\n',
      'event: propertyOverride\ndata: "property format"\n\n',
      "data: [DONE]\n\n",
      "event: progress\ndata: too late\n\n",
    ].join("");
    const fixture = transport("Node", frames, "200", undefined, true);
    const stream = await operations.receive(fixture.context);
    expect(fixture.send).toHaveBeenCalledOnce();
    const items = await collect(stream);
    expect(items).toEqual([
      { event: "progress", data: "hello" },
      { event: "object", data: { value: "model" } },
      { event: "quoted", data: "quoted scalar" },
      { event: "hinted", data: "hinted scalar" },
      { event: "explicit", data: "explicit text" },
      { event: "scalarEnvelope", data: "payload only" },
      { event: "modelEnvelope", data: { value: "wrapped model" } },
      { event: "propertyOverride", data: "property format" },
      { event: "message", data: "[DONE]" },
    ]);
    expect(fixture.nodeBody.destroyed).toBe(true);
    expect(fixture.send).toHaveBeenCalledOnce();
  });

  it("yields a JSON-encoded constant terminal and ignores trailing events", async () => {
    const fixture = transport(
      "Node",
      'event: complete\ndata: "finished"\n\nevent: complete\ndata: "finished"\n\n',
      "200",
      undefined,
      true,
    );
    expect(await collect(await operations.receiveJsonTerminal(fixture.context))).toEqual([
      { event: "complete", data: "finished" },
    ]);
    expect(fixture.nodeBody.destroyed).toBe(true);
  });

  it("preserves message payloads alongside an unnamed terminal with the same output event name", async () => {
    const fixture = transport(
      "Node",
      'event: message\ndata: {"wire_value":"hello"}\n\ndata: [DONE]\n\n',
    );
    expect(await collect(await operations.receiveMessageTerminal(fixture.context))).toEqual([
      { event: "message", data: { value: "hello" } },
      { event: "message", data: "[DONE]" },
    ]);
  });

  it("keeps unnamed streams payload-only while yielding their terminal constant", async () => {
    const fixture = transport("Node", 'data: {"wire_value":"hello"}\n\ndata: [DONE]\n\n');
    const values: (string | { value: string })[] = [];
    for await (const value of await operations.receiveUnnamedTerminal(fixture.context)) {
      values.push(value);
    }
    expect(values).toEqual([{ value: "hello" }, "[DONE]"]);
  });

  it.each(
    ["kind", "event_kind"].flatMap((wireName) =>
      [false, true].flatMap((terminalFirst) =>
        [false, true].map((envelope) => ({ wireName, terminalFirst, envelope })),
      ),
    ),
  )(
    "dispatches unnamed SSE variants and stops after the terminal payload: %j",
    async ({ wireName, terminalFirst, envelope }) => {
      const encodedName =
        wireName === "kind" ? "" : `@encodedName("application/json", "${wireName}")`;
      const progress = envelope ? "ProgressEnvelope" : "Progress";
      const completed = envelope ? "CompletedEnvelope" : "Completed";
      const variants = terminalFirst
        ? `@terminalEvent ${completed}, ${progress}`
        : `${progress}, @terminalEvent ${completed}`;
      const files = await emitModularOperationsFromTypeSpec(`
      @discriminator("kind")
      model StreamEvent { ${encodedName} kind: string; }

      model Progress extends StreamEvent {
        ${encodedName}
        kind: "progress";
        delta: string;
      }
      model Completed extends StreamEvent {
        ${encodedName}
        kind: "complete";
        result: string;
      }
      model ProgressEnvelope { @data contents: Progress; }
      model CompletedEnvelope { @data contents: Completed; }

      @events
      union StreamEvents { ${variants} }

      @route("/receive")
      op receive(): SSEStream<StreamEvents>;
    `);

      expect(files).toHaveLength(1);
      const file = files![0]!;
      const sources = file
        .getProject()
        .getSourceFiles()
        .map((source) => [source.getFilePath(), source.getFullText()] as const);
      const { receive } = createGeneratedRuntime(sources).loadModule<{
        receive(context: unknown): Promise<AsyncIterable<unknown>>;
      }>(file.getFilePath());

      const fixture = transport(
        "Node",
        [
          `data: {"${wireName}":"progress","delta":"hello"}\n\n`,
          `data: {"${wireName}":"complete","result":"final"}\n\n`,
          `data: {"${wireName}":"progress","delta":"after-terminal"}\n\n`,
        ].join(""),
        "200",
        undefined,
        true,
      );
      const actual: unknown[] = [];
      for await (const item of await receive(fixture.context)) {
        actual.push(item);
      }
      expect(actual).toEqual([
        { kind: "progress", delta: "hello" },
        { kind: "complete", result: "final" },
      ]);
      expect(fixture.nodeBody.destroyed).toBe(true);
    },
  );

  it.each([
    ["receiveModelTerminal", '{"wire_value":"finished"}', { value: "finished" }],
    ["receiveNumericTerminal", "42", 42],
    ["receiveBooleanTerminal", "false", false],
  ] as const)("yields the typed terminal payload for %s", async (operation, data, value) => {
    const fixture = transport(
      "Node",
      `event: complete\ndata: ${data}\n\nevent: complete\ndata: ${data}\n\n`,
      "200",
      undefined,
      true,
    );
    expect(await collect(await operations[operation](fixture.context))).toEqual([
      { event: "complete", data: value },
    ]);
    expect(fixture.nodeBody.destroyed).toBe(true);
  });

  it.each([
    ["receiveModelTerminal", "complete", '{"wire_value":"finished"}', { value: "finished" }],
    ["receiveNumericTerminal", "complete", "42", 42],
    ["receiveBooleanTerminal", "complete", "false", false],
    ["receiveScalarTerminal", "complete", "false", false],
    ["receiveJsonTerminal", "complete", '"finished"', "finished"],
    ["receiveOnlyTerminal", "", "[DONE]", "[DONE]"],
  ] as const)(
    "closes the generated %s response before delivering its terminal payload",
    async (operation, event, data, value) => {
      const fixture = transport(
        "Node",
        `${event ? `event: ${event}\n` : ""}data: ${data}\n\n`,
        "200",
        undefined,
        true,
      );
      const iterator = (await operations[operation](fixture.context))[Symbol.asyncIterator]();

      try {
        expect(await iterator.next()).toEqual({
          done: false,
          value: event ? { event, data: value } : value,
        });
        expect(fixture.nodeBody.destroyed).toBe(true);
        expect(await iterator.next()).toEqual({ done: true, value: undefined });
        expect(fixture.send).toHaveBeenCalledOnce();
      } finally {
        await iterator.return?.();
      }
    },
  );

  it("yields a raw constant when an unnamed stream contains only a terminal", async () => {
    const fixture = transport("Node", "data: [DONE]\n\n");
    const values: "[DONE]"[] = [];
    for await (const value of await operations.receiveOnlyTerminal(fixture.context)) {
      values.push(value);
    }
    expect(values).toEqual(["[DONE]"]);
  });

  it.each(["Node", "browser"] as const)(
    "finishes at EOF on %s without reconnecting or changing caller headers and abort signal",
    async (platform) => {
      const fixture = transport(
        platform,
        "id: event-1\nretry: 0\nevent: progress\ndata: hello\n\n",
      );
      const controller = new AbortController();
      const runtime = platform === "Node" ? operations : browserOperations;
      const result = await runtime.receive(fixture.context, {
        abortSignal: controller.signal,
        requestOptions: { headers: { "Last-Event-ID": "caller-id", "x-custom": "keep" } },
      });
      expect(fixture.send).toHaveBeenCalledOnce();
      expect(fixture.get.mock.calls[0][0]).toMatchObject({
        abortSignal: controller.signal,
        headers: {
          accept: "text/event-stream",
          "Last-Event-ID": "caller-id",
          "x-custom": "keep",
        },
      });
      expect(await collect(result)).toEqual([{ event: "progress", data: "hello" }]);
      expect(fixture.send).toHaveBeenCalledOnce();
    },
  );

  it.each(["Node", "browser"] as const)(
    "does not reconnect or inject a Last-Event-ID header after a %s body failure",
    async (platform) => {
      const failure = new Error("transport failed");
      const body =
        platform === "Node"
          ? new Readable({
              read() {
                this.destroy(failure);
              },
            })
          : new ReadableStream<Uint8Array>({
              pull(controller) {
                controller.error(failure);
              },
            });
      const send = vi.fn().mockResolvedValue({
        status: "200",
        headers: { "content-type": "text/event-stream" },
        body,
      });
      const get = vi.fn((_options: { headers: Record<string, string> }) => ({
        asNodeStream: send,
        asBrowserStream: send,
      }));
      const runtime = platform === "Node" ? operations : browserOperations;
      const stream = await runtime.receive({ path: () => ({ get }) });
      await expect(collect(stream)).rejects.toBe(failure);
      expect(send).toHaveBeenCalledOnce();
      expect(get.mock.calls[0][0].headers).toEqual({ accept: "text/event-stream" });
    },
  );

  describe.each(["Node", "browser"] as const)("generated %s SSE error handling", (platform) => {
    it.each(["application/json", "application/problem+json; charset=utf-8"])(
      "rejects eagerly with modeled %s details and exception headers",
      async (contentType) => {
        const fixture = transport(platform, '{"code":"BodyCode","wire_message":"failure"}', "400", {
          "content-type": contentType,
          "x-ms-error-code": "HeaderCode",
        });
        const runtime = platform === "Node" ? operations : browserOperations;
        await expect(runtime.receive(fixture.context)).rejects.toMatchObject({
          statusCode: 400,
          details: { code: "BodyCode", message: "failure", errorCode: "HeaderCode" },
        });
        expect(fixture.send).toHaveBeenCalledOnce();
      },
    );

    it("preserves XML text for eager modeled error enrichment", async () => {
      const fixture = transport(
        platform,
        "<StorageError><Code>XmlCode</Code><Message>XML failure</Message></StorageError>",
        "500",
        { "content-type": "application/xml", "x-ms-error-code": "XmlHeader" },
      );
      const runtime = platform === "Node" ? operations : browserOperations;
      await expect(runtime.receiveXml(fixture.context)).rejects.toMatchObject({
        statusCode: 500,
        details: { code: "XmlCode", message: "XML failure", errorCode: "XmlHeader" },
      });
    });

    it("validates the SSE MIME type eagerly without decoding the success body", async () => {
      const fixture = transport(
        platform,
        "not SSE",
        "200",
        { "content-type": "application/json" },
        true,
      );
      const runtime = platform === "Node" ? operations : browserOperations;
      await expect(runtime.receive(fixture.context)).rejects.toMatchObject({ statusCode: 200 });
      if (platform === "Node") {
        expect(fixture.nodeBody.destroyed).toBe(true);
      } else {
        expect(fixture.cancel).toHaveBeenCalledOnce();
      }
    });

    it("rejects a successful HTTP response with no SSE body eagerly", async () => {
      const send = vi.fn().mockResolvedValue({
        status: "200",
        headers: { "content-type": "text/event-stream" },
      });
      const runtime = platform === "Node" ? operations : browserOperations;
      await expect(
        runtime.receive({
          path: () => ({ get: () => ({ asNodeStream: send, asBrowserStream: send }) }),
        }),
      ).rejects.toMatchObject({ statusCode: 200 });
      expect(send).toHaveBeenCalledOnce();
    });

    it("defers malformed payload decoding until iteration", async () => {
      const fixture = transport(platform, "event: object\ndata: not JSON\n\n");
      const runtime = platform === "Node" ? operations : browserOperations;
      const stream = await runtime.receive(fixture.context);
      await expect(collect(stream)).rejects.toThrow('Unable to deserialize event "object".');
      expect(fixture.send).toHaveBeenCalledOnce();
    });
  });

  it("preserves the published core-sse browser terminal cleanup error rather than suppressing it", async () => {
    const fixture = transport("browser", "data: [DONE]\n\n", "200", undefined, true);
    const stream = await browserOperations.receive(fixture.context);
    const iterator = stream[Symbol.asyncIterator]();
    await expect(iterator.next()).resolves.toEqual({
      done: false,
      value: { event: "message", data: "[DONE]" },
    });
    await expect(iterator.next()).rejects.toThrow("ReadableStream is locked");
    expect(fixture.cancel).not.toHaveBeenCalled();
    expect(fixture.send).toHaveBeenCalledOnce();
  });

  it("preserves both HTTP validation and cleanup failures for an invalid browser response", async () => {
    const cleanupError = new Error("body cancellation failed");
    const body = new ReadableStream<Uint8Array>({
      cancel() {
        throw cleanupError;
      },
    });
    const send = vi.fn().mockResolvedValue({
      status: "200",
      headers: { "content-type": "application/json" },
      body,
    });
    await expect(
      browserOperations.receive({
        path: () => ({ get: () => ({ asBrowserStream: send }) }),
      }),
    ).rejects.toMatchObject({
      name: "AggregateError",
      errors: [expect.objectContaining({ statusCode: 200 }), cleanupError],
      cause: expect.objectContaining({ statusCode: 200 }),
    });
  });
});
