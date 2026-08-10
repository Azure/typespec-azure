# Structured streaming generates a JSONL receive operation returning AsyncIterable

An operation returning `JsonlStream<T>` generates a `Promise<AsyncIterable<T>>` whose body is decoded
lazily as JSON Lines. This is the default behavior.

## TypeSpec

```tsp
model Info {
  desc: string;
}

@route("receive")
op receive(): JsonlStream<Info>;
```

## Operations

```ts operations
import { TestingContext as Client } from "./index.js";
import { Info, infoDeserializer } from "../models/models.js";
import {
  StreamResponse,
  getStreamResponse,
  readJsonlStream,
} from "../static-helpers/streamingHelpers.js";
import { ReceiveOptionalParams } from "./options.js";
import {
  StreamableMethod,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";

export function _receiveSend(
  context: Client,
  options: ReceiveOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context
    .path("/receive")
    .get({
      ...operationOptionsToRequestParameters(options),
      headers: { accept: "application/jsonl", ...options.requestOptions?.headers },
    });
}

export async function _receiveDeserialize(result: StreamResponse): Promise<AsyncIterable<Info>> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return readJsonlStream(result.body, (e) => infoDeserializer(e));
}
export async function receive(
  context: Client,
  options: ReceiveOptionalParams = { requestOptions: {} },
): Promise<AsyncIterable<Info>> {
  const result = await getStreamResponse(_receiveSend(context, options));
  return _receiveDeserialize(result);
}
```
