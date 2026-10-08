import type { StreamableMethod } from "@azure-rest/core-client";
import { createSseStream, type EventMessage } from "@azure/core-sse";
import { Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { getSseResponse as getBrowserSseResponse } from "../../../static/static-helpers/getSseResponse-browser.mjs";
import { parseSseErrorResponse } from "../../../static/static-helpers/getSseResponse.js";
import {
  readSseStream,
  type SseEventDescriptor,
} from "../../../static/static-helpers/sseStreamingHelpers.js";

function events(...values: Partial<EventMessage>[]): AsyncIterable<EventMessage> {
  return (async function* () {
    for (const value of values) {
      yield { id: "", event: "", data: "", ...value };
    }
  })();
}

function sseBody(source: string, onCancel?: () => void): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(source));
      if (!onCancel) {
        controller.close();
      }
    },
    cancel() {
      onCancel?.();
    },
  });
}

function nodeSseBody(source: string, keepOpen = false): Readable {
  const body = new Readable({ read() {} });
  body.push(Buffer.from(source));
  if (!keepOpen) {
    body.push(null);
  }
  return body;
}

async function collect<T>(
  descriptors: SseEventDescriptor<T>[],
  source: AsyncIterable<EventMessage>,
): Promise<T[]> {
  const items: T[] = [];
  for await (const item of readSseStream(source, descriptors)) {
    items.push(item);
  }
  return items;
}

const unnamedWithSentinel: SseEventDescriptor<any>[] = [
  { isTerminal: false, deserialize: (data) => data, contentType: "application/json" },
  { isTerminal: true, terminalValue: "[DONE]", deserialize: () => "[DONE]" },
];

const namedWithSentinel: SseEventDescriptor<any>[] = [
  {
    eventName: "delta",
    isTerminal: false,
    deserialize: (data) => ({ event: "delta", data }),
    contentType: "application/json",
  },
  {
    isTerminal: true,
    terminalValue: "[DONE]",
    deserialize: () => ({ event: "message", data: "[DONE]" }),
  },
];

const unnamedDiscriminated: SseEventDescriptor<unknown>[] = [
  {
    isTerminal: false,
    discriminator: { propertyName: "kind", values: ["progress"] },
    deserialize: (data) => data,
  },
  {
    isTerminal: true,
    discriminator: { propertyName: "kind", values: ["complete"] },
    deserialize: (data) => data,
  },
];

describe("SSE event mapping", () => {
  it.each([false, true])(
    "dispatches unnamed JSON variants independently of terminal order (%s)",
    async (terminalFirst) => {
      const descriptors = terminalFirst
        ? [...unnamedDiscriminated].reverse()
        : unnamedDiscriminated;
      await expect(
        collect(
          descriptors,
          events(
            { data: '{"kind":"progress","delta":"hello"}' },
            { data: '{"kind":"complete","result":"final"}' },
            { data: '{"kind":"progress","delta":"ignored"}' },
          ),
        ),
      ).resolves.toEqual([
        { kind: "progress", delta: "hello" },
        { kind: "complete", result: "final" },
      ]);
    },
  );

  it("matches constant terminals before parsing discriminated JSON variants", async () => {
    await expect(
      collect(
        [
          ...unnamedDiscriminated,
          { isTerminal: true, terminalValue: "[DONE]", deserialize: () => "[DONE]" },
        ],
        events({ data: "[DONE]" }, { data: '{"kind":"progress"}' }),
      ),
    ).resolves.toEqual(["[DONE]"]);
  });

  it.each([false, true])(
    "matches constant terminals before generic and discriminated payloads (%s)",
    async (terminalFirst) => {
      const terminalValue = '{"kind":"complete","result":"final"}';
      const descriptors: SseEventDescriptor<unknown>[] = [
        { isTerminal: false, deserialize: () => "generic" },
        ...unnamedDiscriminated,
        { isTerminal: true, terminalValue, deserialize: (data) => data },
      ];
      await expect(
        collect(
          terminalFirst ? descriptors.reverse() : descriptors,
          events({ data: terminalValue }, { data: '{"kind":"progress"}' }),
        ),
      ).resolves.toEqual([terminalValue]);
    },
  );

  it("does not parse payloads for unknown event names", async () => {
    await expect(
      collect(
        unnamedDiscriminated,
        events({ event: "unknown", data: "{bad" }, { data: '{"kind":"progress"}' }),
      ),
    ).resolves.toEqual([{ kind: "progress" }]);
  });

  it("ignores unknown discriminator values rather than using an unrelated variant", async () => {
    await expect(
      collect(
        unnamedDiscriminated,
        events({ data: '{"kind":"unknown"}' }, { data: '{"kind":"complete"}' }),
      ),
    ).resolves.toEqual([{ kind: "complete" }]);
  });

  it("selects a matching variant before a generic JSON fallback", async () => {
    await expect(
      collect(
        [{ isTerminal: false, deserialize: (data) => data }, ...unnamedDiscriminated],
        events(
          { data: '{"kind":"unknown"}' },
          { data: '{"kind":"complete","result":"final"}' },
          { data: '{"kind":"progress"}' },
        ),
      ),
    ).resolves.toEqual([{ kind: "unknown" }, { kind: "complete", result: "final" }]);
  });

  it("preserves malformed JSON errors during discriminator selection", async () => {
    await expect(collect(unnamedDiscriminated, events({ data: "{bad" }))).rejects.toThrow(
      'Unable to deserialize event "message".',
    );
  });

  it.each(["typed", "sentinel"] as const)(
    "cuts off a synthetic source after a %s terminal and closes its iterator",
    async (kind) => {
      const closed = vi.fn();
      const trailing = vi.fn();
      const source = (async function* () {
        try {
          yield { id: "", event: "delta", data: "hello" };
          yield { id: "", event: "done", data: kind === "typed" ? "finished" : "[DONE]" };
          trailing();
          yield { id: "", event: "delta", data: "too late" };
        } finally {
          closed();
        }
      })();
      const descriptors: SseEventDescriptor<string>[] = [
        { eventName: "delta", isTerminal: false, contentType: "text/plain", deserialize: (x) => x },
        {
          eventName: "done",
          isTerminal: true,
          contentType: "text/plain",
          deserialize: (x) => x,
          ...(kind === "sentinel" ? { terminalValue: "[DONE]" } : {}),
        },
      ];
      await expect(collect(descriptors, source)).resolves.toEqual(
        kind === "typed" ? ["hello", "finished"] : ["hello", "[DONE]"],
      );
      expect(trailing).not.toHaveBeenCalled();
      expect(closed).toHaveBeenCalledOnce();
    },
  );

  it("does not stop for an unrelated named sentinel or a nonterminal constant", async () => {
    const descriptors: SseEventDescriptor<string>[] = [
      { eventName: "done", isTerminal: true, terminalValue: "[DONE]", deserialize: (x) => x },
      { eventName: "control", isTerminal: false, terminalValue: "skip", deserialize: (x) => x },
      { isTerminal: false, contentType: "text/plain", deserialize: (x) => x },
    ];
    await expect(
      collect(
        descriptors,
        events(
          { event: "unrelated", data: "[DONE]" },
          { event: "control", data: "skip" },
          { data: "hello" },
          { event: "done", data: "[DONE]" },
          { data: "too late" },
        ),
      ),
    ).resolves.toEqual(["skip", "hello", "[DONE]"]);
  });

  it("yields deserialized payloads for unnamed events", async () => {
    const items = await collect(
      unnamedWithSentinel,
      events({ data: '{"id":"a"}' }, { data: '{"id":"b"}' }),
    );
    expect(items).toEqual([{ id: "a" }, { id: "b" }]);
  });

  it("yields a constant terminal sentinel before stopping", async () => {
    const items = await collect(
      namedWithSentinel,
      events({ event: "delta", data: '{"id":"a"}' }, { data: "[DONE]" }),
    );
    expect(items).toEqual([
      { event: "delta", data: { id: "a" } },
      { event: "message", data: "[DONE]" },
    ]);
  });

  it("matches terminal events by exact named or unnamed dispatch", async () => {
    await expect(
      collect(namedWithSentinel, events({ data: "[DONE]" }, { event: "delta", data: "{}" })),
    ).resolves.toEqual([{ event: "message", data: "[DONE]" }]);
    await expect(
      collect(
        namedWithSentinel,
        events({ event: "unrelated", data: "[DONE]" }, { event: "delta", data: "{}" }),
      ),
    ).resolves.toEqual([{ event: "delta", data: {} }]);
  });

  it("matches a named sentinel by value before its named payload descriptor", async () => {
    const descriptors: SseEventDescriptor<any>[] = [
      {
        eventName: "message",
        isTerminal: false,
        deserialize: (data) => data,
      },
      {
        eventName: "message",
        isTerminal: true,
        terminalValue: "[DONE]",
        deserialize: () => "[DONE]",
      },
    ];
    await expect(
      collect(
        descriptors,
        events(
          { event: "message", data: "{}" },
          { event: "message", data: "[DONE]" },
          { event: "message", data: "{}" },
        ),
      ),
    ).resolves.toEqual([{}, "[DONE]"]);
  });

  it("matches event names and sentinels containing source-sensitive characters", async () => {
    const eventName = 'event"\\</script>\u2028';
    const terminalValue = 'terminal"\\</script>\u2029';
    const descriptors: SseEventDescriptor<any>[] = [
      {
        eventName,
        isTerminal: false,
        contentType: "text/plain",
        deserialize: (data) => ({ event: eventName, data }),
      },
      { isTerminal: true, terminalValue, deserialize: (data) => ({ event: "message", data }) },
    ];

    await expect(
      collect(
        descriptors,
        events(
          { event: eventName, data: "value" },
          { data: terminalValue },
          { event: eventName, data: "too late" },
        ),
      ),
    ).resolves.toEqual([
      { event: eventName, data: "value" },
      { event: "message", data: terminalValue },
    ]);
  });

  it("yields a typed named terminal event", async () => {
    const descriptors: SseEventDescriptor<any>[] = [
      {
        eventName: "delta",
        isTerminal: false,
        deserialize: (data) => ({ event: "delta", data }),
        contentType: "application/json",
      },
      {
        eventName: "done",
        isTerminal: true,
        deserialize: (data) => ({ event: "done", data }),
        contentType: "application/json",
      },
    ];
    const terminal = { id: "", event: "done", data: '{"final":true}' };
    await expect(collect(descriptors, events(terminal))).resolves.toEqual([
      { event: "done", data: { final: true } },
    ]);
  });

  it("ignores an unknown named event rather than decoding it as unnamed", async () => {
    const items = await collect(
      unnamedWithSentinel,
      events({ event: "mystery", data: '{"id":"unknown"}' }, { data: '{"id":"a"}' }),
    );
    expect(items).toEqual([{ id: "a" }]);
  });

  it("preserves an empty non-JSON payload", async () => {
    const descriptors: SseEventDescriptor<string>[] = [
      { isTerminal: false, deserialize: (data) => data, contentType: "text/plain" },
    ];
    await expect(collect(descriptors, events({ data: "" }, { data: "hi" }))).resolves.toEqual([
      "",
      "hi",
    ]);
  });

  it("adds the event name to malformed JSON errors", async () => {
    await expect(collect(unnamedWithSentinel, events({ data: "{not json" }))).rejects.toThrow(
      'Unable to deserialize event "message".',
    );
  });
});

describe("single-connection SSE mapping", () => {
  it("buffers split UTF-8 error bytes while preserving response metadata", async () => {
    const headers = {
      "Content-Type": "application/problem+json; charset=utf-8",
      "x-ms-error-code": "HeaderCode",
    };
    const bytes = new TextEncoder().encode('{"message":"caf\u00e9 \u{1f30d}"}');
    const response = await parseSseErrorResponse({
      status: "400",
      headers,
      body: Readable.from(Array.from(bytes, (byte) => Uint8Array.of(byte))),
    });
    expect(response).toMatchObject({
      status: "400",
      body: { message: "caf\u00e9 \u{1f30d}" },
    });
    expect(response.headers).toBe(headers);
  });

  it("flushes incomplete UTF-8 at the end of a non-JSON error body", async () => {
    const response = await parseSseErrorResponse({
      status: "500",
      headers: { "content-type": "text/plain" },
      body: Readable.from([Buffer.from("error: "), Uint8Array.of(0xc3)]),
    });
    expect(response.body).toBe("error: \ufffd");
  });

  it("preserves absent and empty SSE error bodies", async () => {
    const absent = { status: "400", headers: {} };
    expect(await parseSseErrorResponse(absent)).toBe(absent);
    expect(
      await parseSseErrorResponse({
        ...absent,
        headers: { "content-type": "application/json" },
        body: Readable.from([]),
      }),
    ).toMatchObject({ status: "400", body: undefined });
  });

  it("propagates a Node error-body read failure", async () => {
    const failure = new Error("error body failed");
    const body = Readable.from(
      (async function* () {
        yield Buffer.from("partial");
        throw failure;
      })(),
    );
    await expect(parseSseErrorResponse({ status: "500", headers: {}, body })).rejects.toBe(failure);
    expect(body.destroyed).toBe(true);
  });

  it("parses structured-suffix JSON error bodies", async () => {
    const response = await parseSseErrorResponse({
      status: "400",
      headers: { "content-type": "application/problem+json" },
      body: nodeSseBody('{"code":"bad-request"}'),
    });
    expect(response.body).toEqual({ code: "bad-request" });
  });

  it("preserves XML error bodies for generated XML deserializers", async () => {
    const response = await parseSseErrorResponse({
      status: "400",
      headers: { "content-type": "application/xml" },
      body: nodeSseBody("<Error><Code>BadRequest</Code></Error>"),
    });
    expect(response.body).toBe("<Error><Code>BadRequest</Code></Error>");
  });

  it("passes a native browser stream through without adapting it", async () => {
    const body = new ReadableStream<Uint8Array>();
    const method = {
      asBrowserStream: async () => ({
        status: "200",
        headers: { "content-type": "text/event-stream" },
        body,
      }),
    } as StreamableMethod;

    const response = await getBrowserSseResponse(method);
    expect(response.body).toBe(body);
  });

  it("maps payloads while ignoring ID and retry metadata and yields a typed terminal", async () => {
    const descriptors: SseEventDescriptor<any>[] = [
      {
        eventName: "delta",
        isTerminal: false,
        deserialize: (data) => ({ event: "delta", data }),
      },
      {
        eventName: "done",
        isTerminal: true,
        deserialize: (data) => ({ event: "done", data }),
      },
    ];
    const body = nodeSseBody(
      'id: event-1\nretry: 1000\nevent: delta\ndata: {"id":"a"}\n\n' +
        'id:\nevent: done\ndata: {"final":true}\n\n',
      true,
    );
    const stream = createSseStream(body);
    await expect(collect(descriptors, stream)).resolves.toEqual([
      { event: "delta", data: { id: "a" } },
      { event: "done", data: { final: true } },
    ]);
    expect(body.destroyed).toBe(true);
  });

  it("completes naturally at EOF without a terminal event", async () => {
    const stream = createSseStream(nodeSseBody('data: {"id":"a"}\n\ndata: {"id":"b"}\n\n'));
    await expect(collect(unnamedWithSentinel, stream)).resolves.toEqual([{ id: "a" }, { id: "b" }]);
  });

  it("closes the native Node body after yielding a terminal sentinel", async () => {
    const body = nodeSseBody("data: [DONE]\n\n", true);
    const stream = createSseStream(body);
    await expect(collect(unnamedWithSentinel, stream)).resolves.toEqual(["[DONE]"]);
    expect(body.destroyed).toBe(true);
  });

  it("closes the Node body when typed payload mapping fails", async () => {
    const body = nodeSseBody("data: {not json\n\n", true);
    const stream = createSseStream(body);
    await expect(collect(unnamedWithSentinel, stream)).rejects.toThrow(
      'Unable to deserialize event "message".',
    );
    expect(body.destroyed).toBe(true);
  });

  it("cancels the native body when the typed consumer breaks", async () => {
    const body = nodeSseBody("data: {}\n\n", true);
    const stream = createSseStream(body);
    for await (const _ of readSseStream(stream, unnamedWithSentinel)) {
      break;
    }
    expect(body.destroyed).toBe(true);
  });

  it("propagates an aborted HTTP body through the mapper", async () => {
    const body = nodeSseBody("", true);
    const stream = createSseStream(body);
    const iterator = readSseStream(stream, unnamedWithSentinel)[Symbol.asyncIterator]();
    const next = iterator.next();
    body.destroy(new Error("HTTP request aborted"));
    await expect(next).rejects.toThrow("aborted");
    expect(body.destroyed).toBe(true);
  });

  it("decodes a native browser response to EOF", async () => {
    await expect(
      collect(unnamedWithSentinel, createSseStream(sseBody('data: {"id":"a"}\n\n'))),
    ).resolves.toEqual([{ id: "a" }]);
  });

  it("exposes the published 2.4 native Web-stream early-exit limitation", async () => {
    const canceled = vi.fn();
    const body = sseBody("data: [DONE]\n\n", canceled);
    await expect(collect(unnamedWithSentinel, createSseStream(body))).rejects.toThrow(
      "ReadableStream is locked",
    );
    expect(canceled).not.toHaveBeenCalled();
    expect(body.locked).toBe(true);
  });
});
