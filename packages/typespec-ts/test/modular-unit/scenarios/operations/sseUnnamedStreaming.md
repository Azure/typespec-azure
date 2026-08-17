# Structured streaming generates an unnamed SSE operation returning AsyncIterable

An operation returning `SSEStream<T>` for a `@events` union with a single unnamed variant generates a
`Promise<AsyncIterable<T>>` whose unnamed `message` events are deserialized to the payload type. This
is the default behavior.

## TypeSpec

```tsp
model Info {
  desc: string;
}

@events
union UnnamedEvents {
  @Events.contentType("application/json")
  Info,
}

@route("receive")
op receive(): SSEStream<UnnamedEvents>;
```

## Operations

```ts operations
import { TestingContext as Client } from "./index.js";
import { Info, infoDeserializer } from "../models/models.js";
import { readSseStream } from "../static-helpers/sseStreamingHelpers.js";
import { StreamResponse, getStreamResponse } from "../static-helpers/streamingHelpers.js";
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
  return context.path("/receive").get({
    ...operationOptionsToRequestParameters(options),
    headers: { accept: "text/event-stream", ...options.requestOptions?.headers },
  });
}

export async function _receiveDeserialize(result: StreamResponse): Promise<AsyncIterable<Info>> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return readSseStream(result.body, [
    {
      isTerminal: false,
      deserialize: (data) => infoDeserializer(data),
      contentType: "application/json",
    },
  ]);
}
export async function receive(
  context: Client,
  options: ReceiveOptionalParams = { requestOptions: {} },
): Promise<AsyncIterable<Info>> {
  const result = await getStreamResponse(_receiveSend(context, options));
  return _receiveDeserialize(result);
}
```
