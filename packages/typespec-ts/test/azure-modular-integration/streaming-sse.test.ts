import { assert, beforeEach, describe, it } from "vitest";

import { SseClient } from "./generated/streaming/sse/src/index.js";

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const item of iter) {
    out.push(item);
  }
  return out;
}

async function take<T>(iter: AsyncIterable<T>, count: number): Promise<T[]> {
  const out: T[] = [];
  for await (const item of iter) {
    out.push(item);
    if (out.length === count) {
      break;
    }
  }
  return out;
}

describe("SSE Streaming Client", () => {
  let client: SseClient;

  beforeEach(() => {
    client = new SseClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
      retryOptions: {
        maxRetries: 0,
      },
    });
  });

  it("should stream unnamed (message) events as an AsyncIterable", async () => {
    const events = await collect(await client.unnamed.receive());
    assert.deepEqual(
      events.map((e) => e.desc),
      ["one", "two", "three"],
    );
  });

  it("should stream heterogeneous named events and stop at terminal [DONE]", async () => {
    const events = await collect(await client.named.receive());

    // Named events keep their `event:` name alongside the payload, so callers can narrow
    // without a cast. The unnamed terminal uses the default `message` event name.
    assert.deepEqual(events, [
      { event: "responseCreated", data: { id: "resp_1" } },
      { event: "responseDelta", data: { delta: "Hello" } },
      { event: "responseDelta", data: { delta: " world" } },
      { event: "message", data: "[DONE]" },
    ]);

    // The discriminant narrows `data` to the matching payload type with no cast.
    const deltas: string[] = [];
    for (const event of events) {
      if (event.event === "responseDelta") {
        deltas.push(event.data.delta);
      }
    }
    assert.deepEqual(deltas, ["Hello", " world"]);
  });

  it("should stream retrieve events dispatched by event name and stop at terminal", async () => {
    const events = await collect(await client.retrieve.stream({ query: "what is typespec?" }));

    assert.deepEqual(events, [
      { event: "partialResult", data: { text: "partial one" } },
      { event: "partialResult", data: { text: "partial two" } },
      { event: "finalResult", data: { references: ["doc1", "doc2"] } },
      { event: "message", data: "[DONE]" },
    ]);
  });

  describe("SSE protocol scenarios", () => {
    let protocol: SseClient["protocol"];
    let data: SseClient["data"];

    beforeEach(() => {
      ({ protocol, data } = client);
    });

    it("should stream only the explicit @data payload", async () => {
      const withEnvelope = await collect(await data.withEnvelope());
      assert.deepEqual(withEnvelope, [{ event: "withEnvelope", data: "hello" }]);
    });

    it("should stream the full model without an explicit @data payload", async () => {
      const withoutEnvelope = await collect(await data.withoutEnvelope());
      assert.deepEqual(withoutEnvelope, [
        {
          event: "withoutEnvelope",
          data: { metadata: { source: "test" }, contents: "world" },
        },
      ]);
    });

    it.each([
      ["id", () => protocol.id()],
      ["invalid id", () => protocol.invalidId()],
      ["retry", () => protocol.retry()],
      ["invalid retry", () => protocol.invalidRetry()],
    ])("should ignore SSE %s metadata while preserving the typed payload", async (_, receive) => {
      const events = await take(await receive(), 1);

      assert.deepEqual(events, [{ event: "message", data: { message: "hello" } }]);
    });

    it("should finish at EOF and resume only through an explicit caller request", async () => {
      const first = await collect(await protocol.reconnect());
      assert.deepEqual(first, [{ event: "message", data: { message: "hello" } }]);
      const second = await collect(
        await protocol.reconnect({ requestOptions: { headers: { "Last-Event-ID": "event-1" } } }),
      );
      assert.deepEqual(second, [{ event: "message", data: { message: "world" } }]);
    });
  });
});
