import { assert, beforeEach, describe, it } from "vitest";

import { Info, SseClient } from "./generated/streaming/sse/src/index.js";

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

interface ProtocolOperations {
  reconnect(options?: {
    lastEventId?: string;
    retryDelayInMs?: number;
    maxRetries?: number;
    requestOptions?: { headers?: Record<string, string> };
  }): Promise<AsyncIterable<unknown>>;
  id(): Promise<AsyncIterable<unknown>>;
  invalidId(): Promise<AsyncIterable<unknown>>;
  retry(): Promise<AsyncIterable<unknown>>;
  invalidRetry(): Promise<AsyncIterable<unknown>>;
}

interface DataOperations {
  withEnvelope(): Promise<AsyncIterable<unknown>>;
  withoutEnvelope(): Promise<AsyncIterable<unknown>>;
}

interface ProtocolClient {
  protocol?: ProtocolOperations;
  data?: DataOperations;
}

function getProtocolClient(client: SseClient): ProtocolClient {
  return client as SseClient & ProtocolClient;
}

const generatedProtocolClient = getProtocolClient(
  new SseClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  }),
);
const supportsProtocolScenarios =
  generatedProtocolClient.protocol !== undefined && generatedProtocolClient.data !== undefined;

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
    // This fixture closes at EOF without a terminal event, so stop after its three modeled events
    // rather than asking the reconnecting transport to treat EOF as successful completion.
    const events = await take<Info>(await client.unnamed.receive(), 3);
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

  // These scenarios are introduced by microsoft/typespec#11613. Keep them skipped until the
  // pinned http-specs package includes the corresponding generated operation group and routes.
  describe.skipIf(!supportsProtocolScenarios)("SSE protocol scenarios", () => {
    let protocol: ProtocolOperations;
    let data: DataOperations;

    beforeEach(() => {
      ({ protocol, data } = getProtocolClient(client) as Required<ProtocolClient>);
    });

    it("should stream events with and without an explicit @data payload", async () => {
      const withEnvelope = await take(await data.withEnvelope(), 1);
      const withoutEnvelope = await take(await data.withoutEnvelope(), 1);

      assert.deepEqual(withEnvelope, [{ event: "withEnvelope", data: "hello" }]);
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

    it("should reconnect automatically with the retained Last-Event-ID", async () => {
      const events = await take(await protocol.reconnect({ retryDelayInMs: 0 }), 2);

      assert.deepEqual(events, [
        { event: "message", data: { message: "hello" } },
        { event: "message", data: { message: "world" } },
      ]);
    });
  });
});
