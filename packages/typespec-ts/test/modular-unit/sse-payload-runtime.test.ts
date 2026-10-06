import { Readable } from "node:stream";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { clearContexts, useContext } from "../../src/context-manager.js";
import { emitModularOperationsFromTypeSpec } from "../util/emit-util.js";
import { createGeneratedRuntime } from "../util/generated-runtime.js";
import { clearCompileCache } from "../util/test-util.js";

interface EventPayload {
  event: string;
  data: string | { value: string };
}

interface GeneratedOperations {
  receive(
    context: unknown,
    options?: { abortSignal?: AbortSignal; requestOptions?: { headers?: Record<string, string> } },
  ): Promise<AsyncIterable<EventPayload>>;
  receiveXml(context: unknown): Promise<AsyncIterable<EventPayload>>;
}

describe("generated SSE payload formats", () => {
  let operations: GeneratedOperations;
  let browserOperations: GeneratedOperations;
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
    ]);
    expect(fixture.nodeBody.destroyed).toBe(true);
    expect(fixture.send).toHaveBeenCalledOnce();
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
    await expect(collect(stream)).rejects.toThrow("ReadableStream is locked");
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
