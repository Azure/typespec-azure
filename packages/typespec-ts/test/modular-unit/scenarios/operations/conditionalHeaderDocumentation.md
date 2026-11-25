# Conditional request headers include status-code and conflict-handling guidance

## TypeSpec

```tsp
@route("/item")
@get
@doc("Reads the stored item.")
op read(
  @header("If-Match") ifMatch?: string,
  @header("If-None-Match") ifNoneMatch?: string,
  @header("If-Modified-Since") ifModifiedSince?: string,
  @header("iF-uNmOdIfIeD-sInCe") ifUnmodifiedSince?: string,
): void;
```

## Operations

Conditional headers are recognized by their case-insensitive wire names. The operation
retains its description and includes one guidance block for all supported conditions.

```ts operations
import { TestingContext as Client } from "./index.js";
import { ReadOptionalParams } from "./options.js";
import {
  StreamableMethod,
  PathUncheckedResponse,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _readSend(
  context: Client,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/item").get({
    ...operationOptionsToRequestParameters(options),
    headers: {
      ...(options?.ifMatch !== undefined ? { "if-match": options?.ifMatch } : {}),
      ...(options?.ifNoneMatch !== undefined ? { "if-none-match": options?.ifNoneMatch } : {}),
      ...(options?.ifModifiedSince !== undefined
        ? { "if-modified-since": options?.ifModifiedSince }
        : {}),
      ...(options?.ifUnmodifiedSince !== undefined
        ? { "if-unmodified-since": options?.ifUnmodifiedSince }
        : {}),
      ...options.requestOptions?.headers,
    },
  });
}

export async function _readDeserialize(result: PathUncheckedResponse): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}

/**
 * Reads the stored item.
 *
 * **Important:** If you set conditional headers (e.g., `If-Unmodified-Since`, `If-Match`),
 * the service may return:
 * - `412 Precondition Failed` if the resource changed since the specified condition.
 * - `304 Not Modified` for GET requests if the resource has not changed.
 *
 * The SDK does not automatically retry or resolve conflicts.
 * You should handle these status codes in your application logic.
 */
export async function read(
  context: Client,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _readSend(context, options);
  return _readDeserialize(result);
}
```

## Client

The client method includes the same status-code and conflict-handling guidance.

```ts classicClient
import { read } from "./api/operations.js";
import { ReadOptionalParams } from "./api/options.js";
import { Pipeline } from "@azure/core-rest-pipeline";

export type { TestingClientOptionalParams } from "./api/testingContext.js";

/** Client for Testing. */
export class TestingClient {
  private _client: TestingContext;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline;

  /** Creates an instance of TestingClient. */
  constructor(endpointParam: string, options: TestingClientOptionalParams = {}) {
    this._client = createTesting(endpointParam, options);
    this.pipeline = this._client.pipeline;
  }

  /**
   * Reads the stored item.
   *
   * **Important:** If you set conditional headers (e.g., `If-Unmodified-Since`, `If-Match`),
   * the service may return:
   * - `412 Precondition Failed` if the resource changed since the specified condition.
   * - `304 Not Modified` for GET requests if the resource has not changed.
   *
   * The SDK does not automatically retry or resolve conflicts.
   * You should handle these status codes in your application logic.
   */
  read(options: ReadOptionalParams = { requestOptions: {} }): Promise<void> {
    return read(this._client, options);
  }
}
```
