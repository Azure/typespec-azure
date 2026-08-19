import { assert, beforeEach, describe, it } from "vitest";

import {
  FinalResult,
  Info,
  PartialResult,
  ResponseCreated,
  ResponseDelta,
  SseClient,
} from "./generated/streaming/sse/src/index.js";

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
    const stream = await client.named.receive();
    // The return type is a discriminated union: { event: "responseCreated" | "responseDelta"; data: T }
    // allowing type-safe narrowing by event name.
    const events = await collect(stream);
    // Terminal `data: [DONE]` must not be yielded.
    assert.strictEqual(events.length, 3);
    // Type narrowing: can check event.event to narrow to specific payload type
    assert.strictEqual((events[0] as ResponseCreated).id, "resp_1");
    assert.strictEqual((events[1] as ResponseDelta).delta, "Hello");
    assert.strictEqual((events[2] as ResponseDelta).delta, " world");
  });

  it("should stream retrieve events dispatched by event name and stop at terminal", async () => {
    const events = await collect<PartialResult | FinalResult>(
      await client.retrieve.stream({ query: "what is typespec?" }),
    );
    assert.strictEqual(events.length, 3);
    assert.strictEqual((events[0] as PartialResult).text, "partial one");
    assert.strictEqual((events[1] as PartialResult).text, "partial two");
    assert.deepEqual((events[2] as FinalResult).references, ["doc1", "doc2"]);
  });
});
