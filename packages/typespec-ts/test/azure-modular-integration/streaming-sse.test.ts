import { assert, beforeEach, describe, it } from "vitest";

import { Info, SseClient } from "./generated/streaming/sse/src/index.js";

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const item of iter) {
    out.push(item);
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
    const events = await collect<Info>(await client.unnamed.receive());
    assert.deepEqual(
      events.map((e) => e.desc),
      ["one", "two", "three"],
    );
  });

  it("should stream heterogeneous named events and stop at terminal [DONE]", async () => {
    const events = await collect(await client.named.receive());

    // Named events keep their `event:` name alongside the payload, so callers can narrow
    // without a cast. Terminal `data: [DONE]` is consumed by the reader and never yielded.
    assert.deepEqual(events, [
      { event: "responseCreated", data: { id: "resp_1" } },
      { event: "responseDelta", data: { delta: "Hello" } },
      { event: "responseDelta", data: { delta: " world" } },
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
    ]);
  });
});
