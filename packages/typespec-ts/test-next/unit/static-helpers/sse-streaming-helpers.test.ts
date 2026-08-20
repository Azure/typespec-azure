import { describe, expect, it } from "vitest";
import {
  readSseStream,
  type SseEventDescriptor,
} from "../../../static/static-helpers/sseStreamingHelpers.js";

const encoder = new TextEncoder();

function sseSource(frames: string[]): AsyncIterable<Uint8Array> {
  return (async function* () {
    for (const frame of frames) {
      yield encoder.encode(frame);
    }
  })();
}

async function collect<T>(descriptors: SseEventDescriptor<T>[], frames: string[]): Promise<T[]> {
  const items: T[] = [];
  for await (const item of readSseStream(sseSource(frames), descriptors)) {
    items.push(item);
  }
  return items;
}

/** An unnamed JSON payload event plus an unnamed `[DONE]` sentinel, as OpenAI-style streams use. */
const unnamedWithSentinel: SseEventDescriptor<any>[] = [
  { isTerminal: false, deserialize: (data) => data, contentType: "application/json" },
  { isTerminal: true, terminalValue: "[DONE]" },
];

/** A named payload event plus an unnamed `[DONE]` sentinel. */
const namedWithSentinel: SseEventDescriptor<any>[] = [
  {
    eventName: "delta",
    isTerminal: false,
    deserialize: (data) => ({ event: "delta", data }),
    contentType: "application/json",
  },
  { isTerminal: true, terminalValue: "[DONE]" },
];

describe("readSseStream", () => {
  it("yields deserialized payloads for unnamed events", async () => {
    const items = await collect(unnamedWithSentinel, [
      'data: {"id":"a"}\n\n',
      'data: {"id":"b"}\n\n',
    ]);
    expect(items).toEqual([{ id: "a" }, { id: "b" }]);
  });

  it("terminates on an unnamed sentinel and ignores everything after it", async () => {
    const items = await collect(namedWithSentinel, [
      'event: delta\ndata: {"id":"a"}\n\n',
      "data: [DONE]\n\n",
      'event: delta\ndata: {"id":"after-done"}\n\n',
    ]);
    expect(items).toEqual([{ event: "delta", data: { id: "a" } }]);
  });

  it("does not terminate when an unrelated event carries the sentinel value", async () => {
    const items = await collect(namedWithSentinel, [
      "event: unrelated\ndata: [DONE]\n\n",
      'event: delta\ndata: {"id":"a"}\n\n',
    ]);
    expect(items).toEqual([{ event: "delta", data: { id: "a" } }]);
  });

  it("yields a typed named terminal event before terminating", async () => {
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
    const items = await collect(descriptors, [
      'event: delta\ndata: {"id":"a"}\n\n',
      'event: done\ndata: {"final":true}\n\n',
      'event: delta\ndata: {"id":"after-done"}\n\n',
    ]);
    expect(items).toEqual([
      { event: "delta", data: { id: "a" } },
      { event: "done", data: { final: true } },
    ]);
  });

  it("ignores an unknown named event rather than decoding it as the unnamed event", async () => {
    const items = await collect(unnamedWithSentinel, [
      'event: mystery\ndata: {"id":"unknown"}\n\n',
      'data: {"id":"a"}\n\n',
    ]);
    expect(items).toEqual([{ id: "a" }]);
  });

  it("preserves an empty non-JSON payload as an empty string", async () => {
    const descriptors: SseEventDescriptor<string>[] = [
      { isTerminal: false, deserialize: (data) => data, contentType: "text/plain" },
    ];
    const items = await collect(descriptors, ["data: \n\n", "data: hi\n\n"]);
    expect(items).toEqual(["", "hi"]);
  });

  it("throws with the event name when a JSON payload cannot be parsed", async () => {
    await expect(collect(unnamedWithSentinel, ["data: {not json\n\n"])).rejects.toThrow(
      'Unable to deserialize event "message".',
    );
  });

  it("returns without yielding when there is no body", async () => {
    const items: unknown[] = [];
    for await (const item of readSseStream(undefined, unnamedWithSentinel)) {
      items.push(item);
    }
    expect(items).toEqual([]);
  });
});
