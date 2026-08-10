# Structured streaming generates a named SSE operation with terminal event dispatch

An operation returning `SSEStream<T>` for a `@events` union with multiple named variants and a
`@terminalEvent` generates a `Promise<AsyncIterable<...>>` of the non-terminal payload types,
dispatching each event by its `event:` name and stopping at the terminal event. This is the default
behavior.

## TypeSpec

```tsp
model ResponseCreated {
  id: string;
}

model ResponseDelta {
  delta: string;
}

@events
union ResponseEvents {
  @Events.contentType("application/json")
  responseCreated: ResponseCreated,

  @Events.contentType("application/json")
  responseDelta: ResponseDelta,

  @Events.contentType("text/plain")
  @terminalEvent
  "[DONE]",
}

@route("receive")
op receive(): SSEStream<ResponseEvents>;
```

## Operations

```ts operations
import { TestingContext as Client } from "./index.js";
import {
  ResponseCreated,
  responseCreatedDeserializer,
  ResponseDelta,
  responseDeltaDeserializer,
} from "../models/models.js";
import {
  StreamResponse,
  getStreamResponse,
  readSseStream,
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
      headers: { accept: "text/event-stream", ...options.requestOptions?.headers },
    });
}

export async function _receiveDeserialize(
  result: StreamResponse,
): Promise<AsyncIterable<ResponseCreated | ResponseDelta>> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return readSseStream(result.body, [
    {
      eventName: "responseCreated",
      isTerminal: false,
      deserialize: (data) => responseCreatedDeserializer(data),
    },
    {
      eventName: "responseDelta",
      isTerminal: false,
      deserialize: (data) => responseDeltaDeserializer(data),
    },
    { isTerminal: true, terminalValue: "[DONE]" },
  ]);
}
export async function receive(
  context: Client,
  options: ReceiveOptionalParams = { requestOptions: {} },
): Promise<AsyncIterable<ResponseCreated | ResponseDelta>> {
  const result = await getStreamResponse(_receiveSend(context, options));
  return _receiveDeserialize(result);
}
```
