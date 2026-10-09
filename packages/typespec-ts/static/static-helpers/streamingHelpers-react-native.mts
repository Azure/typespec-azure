import type { StreamableMethod } from "@azure-rest/core-client";
import { getJsonlStreamResponse, type StreamResponse } from "./streamingHelpers-browser.mjs";

export { readJsonlStream } from "./streamingHelpers-browser.mjs";
export type { StreamResponse } from "./streamingHelpers-browser.mjs";

function combineStreamErrors(
  error: unknown,
  cleanupError: unknown,
  message: string,
): AggregateError {
  return new AggregateError([error, cleanupError], message, { cause: error });
}

/**
 * Adapts React Native streams that expose getReader() but not an async iterator.
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
 * Uses the reader adapter for React Native, with the shared JSONL response handling.
 */
export async function getStreamResponse(
  streamableMethod: StreamableMethod,
  expectedStatuses?: readonly string[],
): Promise<StreamResponse> {
  const response = await streamableMethod.asBrowserStream();
  return getJsonlStreamResponse(
    {
      ...response,
      body: response.body === undefined ? undefined : readableStreamToAsyncIterable(response.body),
    },
    expectedStatuses,
  );
}
