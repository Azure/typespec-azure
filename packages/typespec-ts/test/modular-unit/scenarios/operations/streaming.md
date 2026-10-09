# Structured streaming generates a JSONL receive operation returning AsyncIterable

An operation returning `JsonlStream<T>` generates a `Promise<AsyncIterable<T>>` whose body is decoded
lazily as JSON Lines. This is the default behavior.

Unexpected HTTP statuses buffer the streamed error body before ordinary modeled error handling.

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
  const result = await getStreamResponse(_receiveSend(context, options), ["200"]);
  return _receiveDeserialize(result);
}
```

# Structured SSE payload MIME inference preserves payload-only envelopes

Unannotated scalar payloads use text, models use JSON, and explicit content types or media-type
hints override those defaults. An `@data` event deserializes only its payload, never its envelope.

## TypeSpec

```tsp
@mediaTypeHint("application/json")
scalar JsonText extends string;

model Payload {
  @encodedName("application/json", "wire_value")
  value: string;
}

@events
union PayloadEvents {
  progress: string,
  object: Payload,

  @Events.contentType("application/json")
  quoted: string,

  hinted: JsonText,

  @Events.contentType("application/json")
  scalarEnvelope: {
    @data contents: string,
  },

  @Events.contentType("text/plain")
  modelEnvelope: {
    @data contents: Payload,
  },

  @Events.contentType("text/plain")
  propertyOverride: {
    @data @Events.contentType("application/json") contents: string,
  },

  @terminalEvent
  "[DONE]",
}

@route("receive")
op receive(): SSEStream<PayloadEvents>;
```

## Operations

```ts operations function receive
export async function receive(
  context: Client,
  options: ReceiveOptionalParams = { requestOptions: {} },
): Promise<
  AsyncIterable<
    | { event: "progress"; data: string }
    | { event: "object"; data: Payload }
    | { event: "quoted"; data: string }
    | { event: "hinted"; data: string }
    | { event: "scalarEnvelope"; data: string }
    | { event: "modelEnvelope"; data: Payload }
    | { event: "propertyOverride"; data: string }
    | { event: "message"; data: "[DONE]" }
  >
> {
  const response = await getSseResponse(_receiveSend(context, options));
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(response.status)) {
    const result = await parseSseErrorResponse(response);
    throw createRestError(result);
  }

  const contentType = Object.entries(response.headers)
    .find(([name]) => name.toLowerCase() === "content-type")?.[1]
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (contentType !== "text/event-stream" || !response.body) {
    const error = createRestError(response);
    try {
      await cancelSseResponse(response);
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "Unable to cancel invalid SSE response.", {
        cause: error,
      });
    }
    throw error;
  }

  const descriptors: SseEventDescriptor<
    | { event: "progress"; data: string }
    | { event: "object"; data: Payload }
    | { event: "quoted"; data: string }
    | { event: "hinted"; data: string }
    | { event: "scalarEnvelope"; data: string }
    | { event: "modelEnvelope"; data: Payload }
    | { event: "propertyOverride"; data: string }
    | { event: "message"; data: "[DONE]" }
  >[] = [
    {
      eventName: "progress",
      isTerminal: false,
      deserialize: (data) => ({ event: "progress", data: data }),
      contentType: "text/plain",
    },
    {
      eventName: "object",
      isTerminal: false,
      deserialize: (data) => ({ event: "object", data: payloadDeserializer(data) }),
      contentType: "application/json",
    },
    {
      eventName: "quoted",
      isTerminal: false,
      deserialize: (data) => ({ event: "quoted", data: data }),
      contentType: "application/json",
    },
    {
      eventName: "hinted",
      isTerminal: false,
      deserialize: (data) => ({ event: "hinted", data: data }),
      contentType: "application/json",
    },
    {
      eventName: "scalarEnvelope",
      isTerminal: false,
      deserialize: (data) => ({ event: "scalarEnvelope", data: data }),
      contentType: "text/plain",
    },
    {
      eventName: "modelEnvelope",
      isTerminal: false,
      deserialize: (data) => ({ event: "modelEnvelope", data: payloadDeserializer(data) }),
      contentType: "application/json",
    },
    {
      eventName: "propertyOverride",
      isTerminal: false,
      deserialize: (data) => ({ event: "propertyOverride", data: data }),
      contentType: "application/json",
    },
    {
      isTerminal: true,
      terminalValue: "[DONE]",
      deserialize: () => ({ event: "message", data: "[DONE]" }),
    },
  ];
  const eventStream = createSseStream(response.body);
  return _receiveDeserialize(eventStream, descriptors);
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
import {
  getSseResponse,
  parseSseErrorResponse,
  cancelSseResponse,
} from "../static-helpers/getSseResponse.js";
import { SseEventDescriptor, readSseStream } from "../static-helpers/sseStreamingHelpers.js";
import { ReceiveOptionalParams } from "./options.js";
import {
  StreamableMethod,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";
import { createSseStream, EventMessage } from "@azure/core-sse";

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
  events: AsyncIterable<EventMessage>,
  descriptors: SseEventDescriptor<Info>[],
): Promise<AsyncIterable<Info>> {
  return readSseStream(events, descriptors);
}

export async function receive(
  context: Client,
  options: ReceiveOptionalParams = { requestOptions: {} },
): Promise<AsyncIterable<Info>> {
  const response = await getSseResponse(_receiveSend(context, options));
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(response.status)) {
    const result = await parseSseErrorResponse(response);
    throw createRestError(result);
  }

  const contentType = Object.entries(response.headers)
    .find(([name]) => name.toLowerCase() === "content-type")?.[1]
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (contentType !== "text/event-stream" || !response.body) {
    const error = createRestError(response);
    try {
      await cancelSseResponse(response);
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "Unable to cancel invalid SSE response.", {
        cause: error,
      });
    }
    throw error;
  }

  const descriptors: SseEventDescriptor<Info>[] = [
    {
      isTerminal: false,
      deserialize: (data) => infoDeserializer(data),
      contentType: "application/json",
    },
  ];
  const eventStream = createSseStream(response.body);
  return _receiveDeserialize(eventStream, descriptors);
}
```

# SSE single-connection streaming preserves operation arguments and ordinary query options

A single request preserves required operation arguments, custom headers, and ordinary service
query options. Local validation variables do not collide with service parameter names.

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

@route("receive/{id}")
op receive(
  @path id: string,
  @header customHeader: string,
  @query statusFilter: string,
  @query contentType: string,
  @query lastEventId?: string,
): SSEStream<UnnamedEvents>;
```

## Operations

```ts operations
import { TestingContext as Client } from "./index.js";
import { Info, infoDeserializer } from "../models/models.js";
import {
  getSseResponse,
  parseSseErrorResponse,
  cancelSseResponse,
} from "../static-helpers/getSseResponse.js";
import { SseEventDescriptor, readSseStream } from "../static-helpers/sseStreamingHelpers.js";
import { expandUrlTemplate } from "../static-helpers/urlTemplate.js";
import { ReceiveOptionalParams } from "./options.js";
import {
  StreamableMethod,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";
import { createSseStream, EventMessage } from "@azure/core-sse";

export function _receiveSend(
  context: Client,
  id: string,
  customHeader: string,
  statusFilter: string,
  contentType: string,
  options: ReceiveOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/receive/{id}{?statusFilter,contentType,lastEventId}",
    {
      id: id,
      statusFilter: statusFilter,
      contentType: contentType,
      lastEventId: options?.lastEventId,
    },
    {
      allowReserved: options?.requestOptions?.skipUrlEncoding,
    },
  );
  return context.path(path).get({
    ...operationOptionsToRequestParameters(options),
    headers: {
      "custom-header": customHeader,
      accept: "text/event-stream",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _receiveDeserialize(
  events: AsyncIterable<EventMessage>,
  descriptors: SseEventDescriptor<Info>[],
): Promise<AsyncIterable<Info>> {
  return readSseStream(events, descriptors);
}

export async function receive(
  context: Client,
  id: string,
  customHeader: string,
  statusFilter: string,
  contentType: string,
  options: ReceiveOptionalParams = { requestOptions: {} },
): Promise<AsyncIterable<Info>> {
  const response = await getSseResponse(
    _receiveSend(context, id, customHeader, statusFilter, contentType, options),
  );
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(response.status)) {
    const result = await parseSseErrorResponse(response);
    throw createRestError(result);
  }

  const contentType_1 = Object.entries(response.headers)
    .find(([name]) => name.toLowerCase() === "content-type")?.[1]
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (contentType_1 !== "text/event-stream" || !response.body) {
    const error = createRestError(response);
    try {
      await cancelSseResponse(response);
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "Unable to cancel invalid SSE response.", {
        cause: error,
      });
    }
    throw error;
  }

  const descriptors: SseEventDescriptor<Info>[] = [
    {
      isTerminal: false,
      deserialize: (data) => infoDeserializer(data),
      contentType: "application/json",
    },
  ];
  const eventStream = createSseStream(response.body);
  return _receiveDeserialize(eventStream, descriptors);
}
```

# Structured streaming generates a named SSE operation with terminal event dispatch

An operation returning `SSEStream<T>` for a `@events` union with multiple named variants and a
`@terminalEvent` generates a `Promise<AsyncIterable<...>>` including terminal payload types,
dispatching each event by its `event:` name and stopping after yielding the terminal event.
Unnamed terminals use the default `message` event name in the discriminated union.

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
  getSseResponse,
  parseSseErrorResponse,
  cancelSseResponse,
} from "../static-helpers/getSseResponse.js";
import { SseEventDescriptor, readSseStream } from "../static-helpers/sseStreamingHelpers.js";
import { ReceiveOptionalParams } from "./options.js";
import {
  StreamableMethod,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";
import { createSseStream, EventMessage } from "@azure/core-sse";

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
  events: AsyncIterable<EventMessage>,
  descriptors: SseEventDescriptor<
    | { event: "responseCreated"; data: ResponseCreated }
    | { event: "responseDelta"; data: ResponseDelta }
    | { event: "message"; data: "[DONE]" }
  >[],
): Promise<
  AsyncIterable<
    | { event: "responseCreated"; data: ResponseCreated }
    | { event: "responseDelta"; data: ResponseDelta }
    | { event: "message"; data: "[DONE]" }
  >
> {
  return readSseStream(events, descriptors);
}

export async function receive(
  context: Client,
  options: ReceiveOptionalParams = { requestOptions: {} },
): Promise<
  AsyncIterable<
    | { event: "responseCreated"; data: ResponseCreated }
    | { event: "responseDelta"; data: ResponseDelta }
    | { event: "message"; data: "[DONE]" }
  >
> {
  const response = await getSseResponse(_receiveSend(context, options));
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(response.status)) {
    const result = await parseSseErrorResponse(response);
    throw createRestError(result);
  }

  const contentType = Object.entries(response.headers)
    .find(([name]) => name.toLowerCase() === "content-type")?.[1]
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (contentType !== "text/event-stream" || !response.body) {
    const error = createRestError(response);
    try {
      await cancelSseResponse(response);
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "Unable to cancel invalid SSE response.", {
        cause: error,
      });
    }
    throw error;
  }

  const descriptors: SseEventDescriptor<
    | { event: "responseCreated"; data: ResponseCreated }
    | { event: "responseDelta"; data: ResponseDelta }
    | { event: "message"; data: "[DONE]" }
  >[] = [
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
    {
      isTerminal: true,
      terminalValue: "[DONE]",
      deserialize: () => ({ event: "message", data: "[DONE]" }),
      contentType: "text/plain",
    },
  ];
  const eventStream = createSseStream(response.body);
  return _receiveDeserialize(eventStream, descriptors);
}
```

# Structured streaming yields typed terminal events and primitive SSE payloads

An operation returning `SSEStream<T>` for a `@events` union that mixes a model variant with a
primitive (scalar) variant generates a `Promise<AsyncIterable<...>>`. A typed terminal model is
included in the item union and yielded before iteration stops; primitive events are yielded as-is
via an identity deserializer (no model deserializer exists for them).

## TypeSpec

```tsp
model ResponseCreated {
  id: string;
}

@events
union MixedEvents {
  @Events.contentType("application/json")
  @terminalEvent
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
import {
  getSseResponse,
  parseSseErrorResponse,
  cancelSseResponse,
} from "../static-helpers/getSseResponse.js";
import { SseEventDescriptor, readSseStream } from "../static-helpers/sseStreamingHelpers.js";
import { ReceiveOptionalParams } from "./options.js";
import {
  StreamableMethod,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";
import { createSseStream, EventMessage } from "@azure/core-sse";

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
  events: AsyncIterable<EventMessage>,
  descriptors: SseEventDescriptor<
    { event: "created"; data: ResponseCreated } | { event: "progress"; data: string }
  >[],
): Promise<
  AsyncIterable<{ event: "created"; data: ResponseCreated } | { event: "progress"; data: string }>
> {
  return readSseStream(events, descriptors);
}

export async function receive(
  context: Client,
  options: ReceiveOptionalParams = { requestOptions: {} },
): Promise<
  AsyncIterable<{ event: "created"; data: ResponseCreated } | { event: "progress"; data: string }>
> {
  const response = await getSseResponse(_receiveSend(context, options));
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(response.status)) {
    const result = await parseSseErrorResponse(response);
    throw createRestError(result);
  }

  const contentType = Object.entries(response.headers)
    .find(([name]) => name.toLowerCase() === "content-type")?.[1]
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (contentType !== "text/event-stream" || !response.body) {
    const error = createRestError(response);
    try {
      await cancelSseResponse(response);
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "Unable to cancel invalid SSE response.", {
        cause: error,
      });
    }
    throw error;
  }

  const descriptors: SseEventDescriptor<
    { event: "created"; data: ResponseCreated } | { event: "progress"; data: string }
  >[] = [
    {
      eventName: "created",
      isTerminal: true,
      deserialize: (data) => ({ event: "created", data: responseCreatedDeserializer(data) }),
      contentType: "application/json",
    },
    {
      eventName: "progress",
      isTerminal: false,
      deserialize: (data) => ({ event: "progress", data: data }),
      contentType: "text/plain",
    },
  ];
  const eventStream = createSseStream(response.body);
  return _receiveDeserialize(eventStream, descriptors);
}
```
