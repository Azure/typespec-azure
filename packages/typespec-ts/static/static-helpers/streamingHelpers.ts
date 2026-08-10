import { PathUncheckedResponse, StreamableMethod, createRestError } from "@azure-rest/core-client";
import { createSseStream } from "@azure/core-sse";

/**
 * A streaming response whose body is exposed as a readable stream (obtained via
 * `.asNodeStream()`). The body is iterated lazily so the payload is decoded incrementally
 * rather than buffered up front.
 */
export type StreamResponse = PathUncheckedResponse & {
  body?: AsyncIterable<Uint8Array | string>;
};

/**
 * Describes how to handle a single Server-Sent Event variant when decoding an
 * SSE (`text/event-stream`) response.
 */
export interface SseEventDescriptor<T> {
  /**
   * The SSE `event:` field name this descriptor handles. `undefined` matches the unnamed
   * `message` event (variants with no event name).
   */
  eventName?: string;
  /** Whether receiving this event terminates the stream. */
  isTerminal: boolean;
  /**
   * For terminal events carrying a constant sentinel value, the raw `data` string that
   * marks termination. When set, the stream stops as soon as an event with this data is seen.
   */
  terminalValue?: string;
  /**
   * Deserializes the event's `data` payload (parsed from JSON) into the target type.
   * Omitted for payload-less terminal events.
   */
  deserialize?: (data: any) => T;
}

/**
 * Connects to a streaming operation and returns the raw response with its body exposed as a
 * readable stream. This bypasses Core's default response handling so the streamed body is not
 * buffered or coerced into UTF-8 before it can be decoded.
 */
export async function getStreamResponse(
  streamableMethod: StreamableMethod,
): Promise<StreamResponse> {
  const response = await streamableMethod.asNodeStream();
  return response as unknown as StreamResponse;
}

/**
 * Throws a {@link createRestError} when the streaming response status is not one of the
 * expected statuses. Shared by the generated JSONL and SSE deserializers so error handling
 * matches non-streaming operations.
 */
export function ensureStreamStatus(
  result: PathUncheckedResponse,
  expectedStatuses: string[],
): void {
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }
}

/**
 * Decodes a JSON Lines (JSONL / NDJSON, `application/jsonl`) response body, yielding each
 * non-empty line parsed as JSON and passed through `deserialize`.
 */
export async function* readJsonlStream<T>(
  body: AsyncIterable<Uint8Array | string> | undefined,
  deserialize: (value: any) => T,
): AsyncIterable<T> {
  if (!body) {
    return;
  }
  const decoder = new TextDecoder();
  let buffer = "";
  for await (const chunk of body) {
    buffer += typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true });
    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex >= 0) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (line.length > 0) {
        yield deserialize(JSON.parse(line));
      }
      newlineIndex = buffer.indexOf("\n");
    }
  }
  const rest = buffer.trim();
  if (rest.length > 0) {
    yield deserialize(JSON.parse(rest));
  }
}

/**
 * Decodes a Server-Sent Events (SSE, `text/event-stream`) response body, dispatching each
 * event to the matching {@link SseEventDescriptor} by its `event:` name and yielding the
 * deserialized payload. Iteration stops when a terminal event is received; terminal events
 * are not yielded unless they declare a payload deserializer.
 */
export async function* readSseStream<T>(
  body: AsyncIterable<Uint8Array | string> | undefined,
  descriptors: SseEventDescriptor<T>[],
): AsyncIterable<T> {
  if (!body) {
    return;
  }
  const named = new Map<string, SseEventDescriptor<T>>();
  let unnamed: SseEventDescriptor<T> | undefined;
  const terminalValues: SseEventDescriptor<T>[] = [];
  for (const descriptor of descriptors) {
    if (descriptor.terminalValue !== undefined) {
      terminalValues.push(descriptor);
    }
    if (descriptor.eventName !== undefined) {
      named.set(descriptor.eventName, descriptor);
    } else if (descriptor.terminalValue === undefined) {
      unnamed = descriptor;
    }
  }

  const stream = createSseStream(body as any);
  for await (const event of stream) {
    // Terminal sentinel carried in the event data (e.g. a constant literal variant).
    if (terminalValues.some((descriptor) => descriptor.terminalValue === event.data)) {
      return;
    }
    const descriptor = named.get(event.event) ?? unnamed;
    if (!descriptor) {
      continue;
    }
    if (descriptor.deserialize) {
      const payload = event.data ? JSON.parse(event.data) : undefined;
      yield descriptor.deserialize(payload);
    }
    if (descriptor.isTerminal) {
      return;
    }
  }
}
