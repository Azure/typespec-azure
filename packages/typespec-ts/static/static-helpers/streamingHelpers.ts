import type { PathUncheckedResponse, StreamableMethod } from "@azure-rest/core-client";

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
 * buffered or coerced into UTF-8 before it can be decoded. Non-success bodies are buffered
 * eagerly so generated operations can deserialize modeled errors before returning.
 */
export async function getStreamResponse(
  streamableMethod: StreamableMethod,
  expectedStatuses?: readonly string[],
): Promise<StreamResponse> {
  const response = (await streamableMethod.asNodeStream()) as unknown as StreamResponse;
  const isSuccess = expectedStatuses
    ? expectedStatuses.includes(response.status)
    : Number(response.status) >= 200 && Number(response.status) < 300;
  if (!response.body || isSuccess) {
    return response;
  }

  const decoder = new TextDecoder();
  let body = "";
  for await (const chunk of response.body) {
    body +=
      typeof chunk === "string"
        ? decoder.decode() + chunk
        : decoder.decode(chunk, { stream: true });
  }
  body += decoder.decode();

  const contentType = Object.entries(response.headers)
    .find(([name]) => name.toLowerCase() === "content-type")?.[1]
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();
  return {
    ...response,
    body:
      body.length === 0
        ? undefined
        : contentType?.endsWith("/json") || contentType?.endsWith("+json")
          ? JSON.parse(body)
          : body,
  } as StreamResponse;
}

function combineStreamErrors(
  error: unknown,
  cleanupError: unknown,
  message: string,
): AggregateError {
  return new AggregateError([error, cleanupError], message, { cause: error });
}

async function closeJsonlIterator(
  iterator: AsyncIterator<unknown>,
  failed: boolean,
  failure: unknown,
): Promise<void> {
  try {
    await iterator.return?.();
  } catch (error) {
    if (failed && error !== failure) {
      throw combineStreamErrors(failure, error, "JSONL decoding and stream cleanup failed.");
    }
    throw error;
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
  const iterator = body[Symbol.asyncIterator]();
  let completed = false;
  let failed = false;
  let failure: unknown;
  try {
    while (true) {
      const { done, value: chunk } = await iterator.next();
      if (done) {
        completed = true;
        break;
      }
      buffer +=
        typeof chunk === "string"
          ? decoder.decode() + chunk
          : decoder.decode(chunk, { stream: true });
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
    buffer += decoder.decode();
    const rest = buffer.trim();
    if (rest.length > 0) {
      yield deserialize(JSON.parse(rest));
    }
  } catch (error) {
    failed = true;
    failure = error;
    throw error;
  } finally {
    if (!completed) {
      await closeJsonlIterator(iterator, failed, failure);
    }
  }
}
