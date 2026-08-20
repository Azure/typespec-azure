import { PathUncheckedResponse, StreamableMethod, createRestError } from "@azure-rest/core-client";

/**
 * A streaming response whose body is exposed as a readable stream (obtained via
 * `.asNodeStream()`). The body is iterated lazily so the payload is decoded incrementally
 * rather than buffered up front.
 */
export type StreamResponse = PathUncheckedResponse & {
  body?: AsyncIterable<Uint8Array | string>;
};

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
