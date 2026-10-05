import type { StreamableMethod } from "@azure-rest/core-client";
import {
  createReconnectingSseStream,
  type EventMessage,
  type SseConnectOptions,
} from "@azure/core-sse";
import { describe, expect, it, vi } from "vitest";
import { getSseResponse as getBrowserSseResponse } from "../../../static/static-helpers/getSseResponse-browser.mjs";
import { parseSseErrorResponse } from "../../../static/static-helpers/getSseResponse.js";
import {
  isTerminalSseEvent,
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
  { isTerminal: true, terminalValue: "[DONE]" },
];

const namedWithSentinel: SseEventDescriptor<any>[] = [
  {
    eventName: "delta",
    isTerminal: false,
    deserialize: (data) => ({ event: "delta", data }),
    contentType: "application/json",
  },
  { isTerminal: true, terminalValue: "[DONE]" },
];

describe("SSE event mapping", () => {
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
          ...(kind === "typed" ? { deserialize: (x: string) => x } : { terminalValue: "[DONE]" }),
        },
      ];
      await expect(collect(descriptors, source)).resolves.toEqual(
        kind === "typed" ? ["hello", "finished"] : ["hello"],
      );
      expect(trailing).not.toHaveBeenCalled();
      expect(closed).toHaveBeenCalledOnce();
    },
  );

  it("does not stop for an unrelated named sentinel or a nonterminal constant", async () => {
    const descriptors: SseEventDescriptor<string>[] = [
      { eventName: "done", isTerminal: true, terminalValue: "[DONE]" },
      { eventName: "control", isTerminal: false, terminalValue: "skip" },
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
    ).resolves.toEqual(["hello"]);
  });

  it("yields deserialized payloads for unnamed events", async () => {
    const items = await collect(
      unnamedWithSentinel,
      events({ data: '{"id":"a"}' }, { data: '{"id":"b"}' }),
    );
    expect(items).toEqual([{ id: "a" }, { id: "b" }]);
  });

  it("suppresses a constant terminal sentinel", async () => {
    const items = await collect(
      namedWithSentinel,
      events({ event: "delta", data: '{"id":"a"}' }, { data: "[DONE]" }),
    );
    expect(items).toEqual([{ event: "delta", data: { id: "a" } }]);
  });

  it("matches terminal events by exact named or unnamed dispatch", () => {
    expect(isTerminalSseEvent({ id: "", event: "", data: "[DONE]" }, namedWithSentinel)).toBe(true);
    expect(
      isTerminalSseEvent({ id: "", event: "unrelated", data: "[DONE]" }, namedWithSentinel),
    ).toBe(false);
  });

  it("matches a named sentinel by value before its named payload descriptor", () => {
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
      },
    ];
    expect(isTerminalSseEvent({ id: "", event: "message", data: "[DONE]" }, descriptors)).toBe(
      true,
    );
    expect(isTerminalSseEvent({ id: "", event: "message", data: "{}" }, descriptors)).toBe(false);
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
      { isTerminal: true, terminalValue },
    ];

    await expect(
      collect(descriptors, events({ event: eventName, data: "value" })),
    ).resolves.toEqual([{ event: eventName, data: "value" }]);
    expect(isTerminalSseEvent({ id: "", event: "", data: terminalValue }, descriptors)).toBe(true);
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
    expect(isTerminalSseEvent(terminal, descriptors)).toBe(true);
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

describe("reconnecting SSE mapping", () => {
  it("parses structured-suffix JSON error bodies", async () => {
    const response = await parseSseErrorResponse({
      status: "400",
      headers: { "content-type": "application/problem+json" },
      body: sseBody('{"code":"bad-request"}'),
    });
    expect(response.body).toEqual({ code: "bad-request" });
  });

  it("preserves XML error bodies for generated XML deserializers", async () => {
    const response = await parseSseErrorResponse({
      status: "400",
      headers: { "content-type": "application/xml" },
      body: sseBody("<Error><Code>BadRequest</Code></Error>"),
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

  it("reconnects with the retained ID and stops on a typed terminal event", async () => {
    const connectOptions: SseConnectOptions[] = [];
    const responses = [
      'id: event-1\nevent: delta\ndata: {"id":"a"}\n\n',
      'event: done\ndata: {"final":true}\n\n',
    ];
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
    const stream = await createReconnectingSseStream(
      async (options) => {
        connectOptions.push(options);
        return {
          status: "200",
          headers: { "content-type": "text/event-stream" },
          body: sseBody(responses[connectOptions.length - 1]),
        };
      },
      {
        retryDelayInMs: 0,
        maxRetries: 1,
        isTerminalEvent: (event) => isTerminalSseEvent(event, descriptors),
      },
    );

    await expect(collect(descriptors, stream)).resolves.toEqual([
      { event: "delta", data: { id: "a" } },
      { event: "done", data: { final: true } },
    ]);
    expect(connectOptions.map(({ lastEventId }) => lastEventId)).toEqual([undefined, "event-1"]);
  });

  it("does not resume a cleared event ID", async () => {
    const connect = vi
      .fn<(options: SseConnectOptions) => Promise<any>>()
      .mockResolvedValueOnce({
        status: "200",
        headers: { "content-type": "text/event-stream" },
        body: sseBody("id: event-1\ndata: {}\n\nid:\n\n"),
      })
      .mockResolvedValueOnce({
        status: "204",
        headers: {},
      });
    const stream = await createReconnectingSseStream(connect, {
      retryDelayInMs: 0,
      maxRetries: 1,
    });

    for await (const _ of stream) {
      // Drain the stream so reconnection occurs.
    }
    expect(connect.mock.calls[1][0].lastEventId).toBeUndefined();
  });

  it("cancels the native body as soon as a constant terminal arrives", async () => {
    const canceled = vi.fn();
    const stream = await createReconnectingSseStream(
      async () => ({
        status: "200",
        headers: { "content-type": "text/event-stream" },
        body: sseBody("data: [DONE]\n\n", canceled),
      }),
      {
        isTerminalEvent: (event) => isTerminalSseEvent(event, unnamedWithSentinel),
      },
    );

    await expect(collect(unnamedWithSentinel, stream)).resolves.toEqual([]);
    expect(canceled).toHaveBeenCalledOnce();
  });

  it("rejects the initial connection eagerly", async () => {
    await expect(
      createReconnectingSseStream(async () => ({ status: "500", headers: {} })),
    ).rejects.toThrow("Unexpected SSE response status: 500");
  });

  it("validates a reconnect response before reading it", async () => {
    const connect = vi
      .fn<(options: SseConnectOptions) => Promise<any>>()
      .mockResolvedValueOnce({
        status: "200",
        headers: { "content-type": "text/event-stream" },
        body: sseBody("data: {}\n\n"),
      })
      .mockResolvedValueOnce({ status: "500", headers: {} });
    const stream = await createReconnectingSseStream(connect, {
      retryDelayInMs: 0,
      maxRetries: 1,
    });

    await expect(
      (async () => {
        for await (const _ of stream) {
          // Drain the first connection so the invalid reconnect is validated.
        }
      })(),
    ).rejects.toThrow("Unexpected SSE response status: 500");
  });

  it("stops reconnecting when typed payload mapping fails", async () => {
    const connect = vi.fn(async () => ({
      status: "200",
      headers: { "content-type": "text/event-stream" },
      body: sseBody("data: {not json\n\n"),
    }));
    const stream = await createReconnectingSseStream(connect, {
      retryDelayInMs: 0,
    });

    await expect(collect(unnamedWithSentinel, stream)).rejects.toThrow(
      'Unable to deserialize event "message".',
    );
    expect(connect).toHaveBeenCalledOnce();
  });

  it("cancels the native body when the typed consumer breaks", async () => {
    const canceled = vi.fn();
    const connect = vi.fn(async () => ({
      status: "200",
      headers: { "content-type": "text/event-stream" },
      body: sseBody("data: {}\n\n", canceled),
    }));
    const stream = await createReconnectingSseStream(connect);

    for await (const _ of readSseStream(stream, unnamedWithSentinel)) {
      break;
    }
    expect(canceled).toHaveBeenCalledOnce();
    expect(connect).toHaveBeenCalledOnce();
  });

  it("forwards caller abort through the mapper lifecycle", async () => {
    const canceled = vi.fn();
    const controller = new AbortController();
    const stream = await createReconnectingSseStream(
      async () => ({
        status: "200",
        headers: { "content-type": "text/event-stream" },
        body: sseBody("", canceled),
      }),
      { abortSignal: controller.signal },
    );
    const iterator = readSseStream(stream, unnamedWithSentinel)[Symbol.asyncIterator]();
    const next = iterator.next();
    controller.abort();

    await expect(next).rejects.toThrow("aborted");
    expect(canceled).toHaveBeenCalledOnce();
  });
});
