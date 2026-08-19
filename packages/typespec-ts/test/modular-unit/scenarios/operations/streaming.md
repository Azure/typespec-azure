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
  return context.path("/receive").get({
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

export async function _receiveDeserialize(
  result: StreamResponse,
): Promise<
  AsyncIterable<
    | { event: "responseCreated"; data: ResponseCreated }
    | { event: "responseDelta"; data: ResponseDelta }
  >
> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return readSseStream(result.body, [
    {
      eventName: "responseCreated",
      isTerminal: false,
      deserialize: (data) => ({
        event: "responseCreated",
        data: responseCreatedDeserializer(data),
      }),
      contentType: "application/json",
    },
    {
      eventName: "responseDelta",
      isTerminal: false,
      deserialize: (data) => ({ event: "responseDelta", data: responseDeltaDeserializer(data) }),
      contentType: "application/json",
    },
    { isTerminal: true, terminalValue: "[DONE]" },
  ]);
}
export async function receive(
  context: Client,
  options: ReceiveOptionalParams = { requestOptions: {} },
): Promise<
  AsyncIterable<
    | { event: "responseCreated"; data: ResponseCreated }
    | { event: "responseDelta"; data: ResponseDelta }
  >
> {
  const result = await getStreamResponse(_receiveSend(context, options));
  return _receiveDeserialize(result);
}
```

# Structured streaming yields raw payloads for non-terminal primitive SSE events

An operation returning `SSEStream<T>` for a `@events` union that mixes a model variant with a
primitive (scalar) variant generates a `Promise<AsyncIterable<...>>` whose primitive events are
yielded as-is via an identity deserializer (no model deserializer exists for them).

## TypeSpec

```tsp
model ResponseCreated {
  id: string;
}

@events
union MixedEvents {
  @Events.contentType("application/json")
  created: ResponseCreated,

  @Events.contentType("text/plain")
  progress: string,
}

@route("receive")
op receive(): SSEStream<MixedEvents>;
```

## Operations

```ts operations
import { TestingContext as Client } from "./index.js";
import { ResponseCreated, responseCreatedDeserializer } from "../models/models.js";
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

export async function _receiveDeserialize(
  result: StreamResponse,
): Promise<
  AsyncIterable<{ event: "created"; data: ResponseCreated } | { event: "progress"; data: string }>
> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return readSseStream(result.body, [
    {
      eventName: "created",
      isTerminal: false,
      deserialize: (data) => ({ event: "created", data: responseCreatedDeserializer(data) }),
      contentType: "application/json",
    },
    {
      eventName: "progress",
      isTerminal: false,
      deserialize: (data) => ({ event: "progress", data: data }),
      contentType: "text/plain",
    },
  ]);
}

export async function receive(
  context: Client,
  options: ReceiveOptionalParams = { requestOptions: {} },
): Promise<
  AsyncIterable<{ event: "created"; data: ResponseCreated } | { event: "progress"; data: string }>
> {
  const result = await getStreamResponse(_receiveSend(context, options));
  return _receiveDeserialize(result);
}
```
