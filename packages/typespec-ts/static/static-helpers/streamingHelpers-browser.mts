import type { PathUncheckedResponse, StreamableMethod } from "@azure-rest/core-client";

/**
 * A streaming response whose body is exposed as a readable stream (obtained via
 * `.asBrowserStream()`). The body is iterated lazily so the payload is decoded incrementally
 * rather than buffered up front.
 */
export type StreamResponse = PathUncheckedResponse & {
  body?: AsyncIterable<Uint8Array | string>;
};

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
 * Converts a ReadableStream to an AsyncIterable.
 */
function readableStreamToAsyncIterable(
  stream: ReadableStream<Uint8Array>,
): AsyncIterable<Uint8Array> {
  return {
    [Symbol.asyncIterator]() {
      const reader = stream.getReader();
      let finished = false;
      let reachedEof = false;
      let cleanup: Promise<void> | undefined;
      function close(): Promise<void> {
        if (cleanup) {
          return cleanup;
        }
        finished = true;
        cleanup = (async () => {
          let cancelFailed = false;
          let cancelFailure: unknown;
          try {
            if (!reachedEof) {
              await reader.cancel();
            }
          } catch (error) {
            cancelFailed = true;
            cancelFailure = error;
          }
          try {
            reader.releaseLock();
          } catch (error) {
            if (cancelFailed) {
              throw combineStreamErrors(
                cancelFailure,
                error,
                "Stream cancellation and lock release failed.",
              );
            }
            throw error;
          }
          if (cancelFailed) {
            throw cancelFailure;
          }
        })();
        return cleanup;
      }
      return {
        async next(): Promise<IteratorResult<Uint8Array>> {
          if (finished) {
            return { done: true, value: undefined };
          }
          let result: ReadableStreamReadResult<Uint8Array>;
          try {
            result = await reader.read();
          } catch (error) {
            try {
              await close();
            } catch (cleanupError) {
              if (cleanupError !== error) {
                throw combineStreamErrors(
                  error,
                  cleanupError,
                  "Stream reading and cleanup failed.",
                );
              }
            }
            throw error;
          }
          if (finished) {
            return { done: true, value: undefined };
          }
          if (result.done) {
            reachedEof = true;
            await close();
            return { done: true, value: undefined };
          }
          return { done: false, value: result.value };
        },
        async return() {
          await close();
          return { done: true, value: undefined };
        },
      };
    },
  };
}

/**
 * Connects to a streaming operation and returns the raw response with its body exposed as a
 * readable stream. This bypasses Core's default response handling so the streamed body is not
 * buffered or coerced into UTF-8 before it can be decoded. Non-success bodies are buffered
 * eagerly so generated operations can deserialize modeled errors before returning.
 *
 * Browser implementation: uses asBrowserStream() and converts ReadableStream to AsyncIterable.
 */
export async function getStreamResponse(
  streamableMethod: StreamableMethod,
  expectedStatuses?: readonly string[],
): Promise<StreamResponse> {
  const response = await streamableMethod.asBrowserStream();
  if (response.body === undefined) {
    return response as unknown as StreamResponse;
  }
  const result = {
    ...response,
    body: readableStreamToAsyncIterable(response.body),
  } as unknown as StreamResponse;
  const isSuccess = expectedStatuses
    ? expectedStatuses.includes(result.status)
    : Number(result.status) >= 200 && Number(result.status) < 300;
  if (isSuccess) {
    return result;
  }

  const decoder = new TextDecoder();
  let body = "";
  for await (const chunk of result.body!) {
    body +=
      typeof chunk === "string"
        ? decoder.decode() + chunk
        : decoder.decode(chunk, { stream: true });
  }
  body += decoder.decode();

  const contentType = Object.entries(result.headers)
    .find(([name]) => name.toLowerCase() === "content-type")?.[1]
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();
  return {
    ...result,
    body:
      body.length === 0
        ? undefined
        : contentType?.endsWith("/json") || contentType?.endsWith("+json")
          ? JSON.parse(body)
          : body,
  } as StreamResponse;
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
