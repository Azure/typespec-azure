import { Readable } from "node:stream";
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
}

describe("generated SSE payload formats", () => {
  let operations: GeneratedOperations;
  let browserOperations: GeneratedOperations;
  let reactNativeOperations: GeneratedOperations;
  let payloadContentTypes: (string | undefined)[] | undefined;

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
