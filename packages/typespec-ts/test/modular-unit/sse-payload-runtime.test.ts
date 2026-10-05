import { beforeAll, describe, expect, it, vi } from "vitest";
import { emitModularOperationsFromTypeSpec } from "../util/emit-util.js";
import { createGeneratedRuntime } from "../util/generated-runtime.js";

interface EventPayload {
  event: string;
  data: string | { value: string };
}

interface GeneratedOperations {
  receive(context: {
    path(path: string): {
      get(options: unknown): { asNodeStream(): Promise<unknown> };
    };
  }): Promise<AsyncIterable<EventPayload>>;
}

describe("generated SSE payload formats", () => {
  let operations: GeneratedOperations;

  beforeAll(async () => {
    const files = await emitModularOperationsFromTypeSpec(`
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
      op receive(): SSEStream<PayloadEvents>;
    `);
    expect(files).toHaveLength(1);
    const file = files![0]!;
    operations = createGeneratedRuntime(
      file
        .getProject()
        .getSourceFiles()
        .map((source) => [source.getFilePath(), source.getFullText()] as const),
    ).loadModule<GeneratedOperations>(file.getFilePath());
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
    const encoder = new TextEncoder();
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(frames));
      },
      cancel,
    });
    const send = vi.fn().mockResolvedValue({
      status: "200",
      headers: { "content-type": "text/event-stream" },
      body,
    });
    const context = {
      path: () => ({ get: () => ({ asNodeStream: send }) }),
    };

    const stream = await operations.receive(context);
    expect(send).toHaveBeenCalledOnce();
    const items: EventPayload[] = [];
    for await (const item of stream) {
      items.push(item);
    }
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
    expect(cancel).toHaveBeenCalledOnce();
    expect(body.locked).toBe(false);
  });
});
