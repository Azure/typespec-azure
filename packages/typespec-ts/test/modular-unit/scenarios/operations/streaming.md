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
  >
> {
  const descriptors: SseEventDescriptor<
    | { event: "progress"; data: string }
    | { event: "object"; data: Payload }
    | { event: "quoted"; data: string }
    | { event: "hinted"; data: string }
    | { event: "scalarEnvelope"; data: string }
    | { event: "modelEnvelope"; data: Payload }
    | { event: "propertyOverride"; data: string }
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
    { isTerminal: true, terminalValue: "[DONE]" },
  ];
  const eventStream = await createReconnectingSseStream(
    async ({ abortSignal, lastEventId }) => {
      const headers = { ...options.requestOptions?.headers };
      for (const headerName of Object.keys(headers)) {
        if (headerName.toLowerCase() === "last-event-id") {
          delete headers[headerName];
        }
      }
      if (lastEventId !== undefined) {
        headers["Last-Event-ID"] = lastEventId;
      }
      const attemptOptions = {
        ...options,
        abortSignal,
        requestOptions: {
          ...options.requestOptions,
          headers: headers,
        },
      };
      return getSseResponse(_receiveSend(context, attemptOptions));
    },
    {
      abortSignal: options.abortSignal,
      lastEventId: options.lastEventId,
      retryDelayInMs: options.retryDelayInMs,
      maxRetries: options.maxRetries,
      validateResponse: async (result) => {
        if (result.status === "204") {
          return "stop";
        }
        const expectedStatuses = ["200"];
        if (!expectedStatuses.includes(result.status)) {
          result = await parseSseErrorResponse(result);
          throw createRestError(result);
        }
        const contentType = Object.entries(result.headers)
          .find(([name]) => name.toLowerCase() === "content-type")?.[1]
          ?.split(";", 1)[0]
          .trim()
          .toLowerCase();
        if (contentType !== "text/event-stream" || !result.body) {
          throw createRestError(result);
        }
        return "accept";
      },
      isTerminalEvent: (event) => isTerminalSseEvent(event, descriptors),
    },
  );
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
import { getSseResponse, parseSseErrorResponse } from "../static-helpers/getSseResponse.js";
import {
  SseEventDescriptor,
  readSseStream,
  isTerminalSseEvent,
} from "../static-helpers/sseStreamingHelpers.js";
import { ReceiveOptionalParams } from "./options.js";
import {
  StreamableMethod,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";
import { createReconnectingSseStream, EventMessage } from "@azure/core-sse";

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
  const descriptors: SseEventDescriptor<Info>[] = [
    {
      isTerminal: false,
      deserialize: (data) => infoDeserializer(data),
      contentType: "application/json",
    },
  ];
  const eventStream = await createReconnectingSseStream(
    async ({ abortSignal, lastEventId }) => {
      const headers = { ...options.requestOptions?.headers };
      for (const headerName of Object.keys(headers)) {
        if (headerName.toLowerCase() === "last-event-id") {
          delete headers[headerName];
        }
      }
      if (lastEventId !== undefined) {
        headers["Last-Event-ID"] = lastEventId;
      }
      const attemptOptions = {
        ...options,
        abortSignal,
        requestOptions: {
          ...options.requestOptions,
          headers: headers,
        },
      };
      return getSseResponse(_receiveSend(context, attemptOptions));
    },
    {
      abortSignal: options.abortSignal,
      lastEventId: options.lastEventId,
      retryDelayInMs: options.retryDelayInMs,
      maxRetries: options.maxRetries,
      validateResponse: async (result) => {
        if (result.status === "204") {
          return "stop";
        }
        const expectedStatuses = ["200"];
        if (!expectedStatuses.includes(result.status)) {
          result = await parseSseErrorResponse(result);
          throw createRestError(result);
        }
        const contentType = Object.entries(result.headers)
          .find(([name]) => name.toLowerCase() === "content-type")?.[1]
          ?.split(";", 1)[0]
          .trim()
          .toLowerCase();
        if (contentType !== "text/event-stream" || !result.body) {
          throw createRestError(result);
        }
        return "accept";
      },
      isTerminalEvent: (event) => isTerminalSseEvent(event, descriptors),
    },
  );
  return _receiveDeserialize(eventStream, descriptors);
}
```

# Structured SSE metadata emits safe source literals without changing values

SSE event names, terminal sentinels, and content types can contain characters that require escaping
in generated TypeScript source.

## TypeSpec

```tsp
@events
union EscapedEvents {
  @Events.contentType("text/plain; profile=\"</script>\\\\value\"")
  `event"\\</script>`: string,

  @terminalEvent
  "terminal \" \\\\ </script>\ncontrol",
}

@route("receive")
op receive(): SSEStream<EscapedEvents>;
```

## Operations

```ts operations
import { TestingContext as Client } from "./index.js";
import { getSseResponse, parseSseErrorResponse } from "../static-helpers/getSseResponse.js";
import {
  SseEventDescriptor,
  readSseStream,
  isTerminalSseEvent,
} from "../static-helpers/sseStreamingHelpers.js";
import { ReceiveOptionalParams } from "./options.js";
import {
  StreamableMethod,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";
import { createReconnectingSseStream, EventMessage } from "@azure/core-sse";

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
  descriptors: SseEventDescriptor<{ event: 'event"\\\u003c/script\u003e'; data: string }>[],
): Promise<AsyncIterable<{ event: 'event"\\\u003c/script\u003e'; data: string }>> {
  return readSseStream(events, descriptors);
}

export async function receive(
  context: Client,
  options: ReceiveOptionalParams = { requestOptions: {} },
): Promise<AsyncIterable<{ event: 'event"\\\u003c/script\u003e'; data: string }>> {
  const descriptors: SseEventDescriptor<{ event: 'event"\\\u003c/script\u003e'; data: string }>[] =
    [
      {
        eventName: 'event"\\\u003c/script\u003e',
        isTerminal: false,
        deserialize: (data) => ({ event: 'event"\\\u003c/script\u003e', data: data }),
        contentType: 'text/plain; profile="\u003c/script\u003e\\\\value"',
      },
      { isTerminal: true, terminalValue: 'terminal " \\\\ \u003c/script\u003e\ncontrol' },
    ];
  const eventStream = await createReconnectingSseStream(
    async ({ abortSignal, lastEventId }) => {
      const headers = { ...options.requestOptions?.headers };
      for (const headerName of Object.keys(headers)) {
        if (headerName.toLowerCase() === "last-event-id") {
          delete headers[headerName];
        }
      }
      if (lastEventId !== undefined) {
        headers["Last-Event-ID"] = lastEventId;
      }
      const attemptOptions = {
        ...options,
        abortSignal,
        requestOptions: {
          ...options.requestOptions,
          headers: headers,
        },
      };
      return getSseResponse(_receiveSend(context, attemptOptions));
    },
    {
      abortSignal: options.abortSignal,
      lastEventId: options.lastEventId,
      retryDelayInMs: options.retryDelayInMs,
      maxRetries: options.maxRetries,
      validateResponse: async (result) => {
        if (result.status === "204") {
          return "stop";
        }
        const expectedStatuses = ["200"];
        if (!expectedStatuses.includes(result.status)) {
          result = await parseSseErrorResponse(result);
          throw createRestError(result);
        }
        const contentType = Object.entries(result.headers)
          .find(([name]) => name.toLowerCase() === "content-type")?.[1]
          ?.split(";", 1)[0]
          .trim()
          .toLowerCase();
        if (contentType !== "text/event-stream" || !result.body) {
          throw createRestError(result);
        }
        return "accept";
      },
      isTerminalEvent: (event) => isTerminalSseEvent(event, descriptors),
    },
  );
  return _receiveDeserialize(eventStream, descriptors);
}
```

# SSE reconnection preserves operation arguments and avoids option name collisions

Every connection attempt reuses required operation arguments and custom headers. Reconnection
controls are renamed when a service operation already defines an option with the same name.

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
  @query lastEventId?: string,
): SSEStream<UnnamedEvents>;
```

## Operations

```ts operations
import { TestingContext as Client } from "./index.js";
import { Info, infoDeserializer } from "../models/models.js";
import { getSseResponse, parseSseErrorResponse } from "../static-helpers/getSseResponse.js";
import {
  SseEventDescriptor,
  readSseStream,
  isTerminalSseEvent,
} from "../static-helpers/sseStreamingHelpers.js";
import { expandUrlTemplate } from "../static-helpers/urlTemplate.js";
import { ReceiveOptionalParams } from "./options.js";
import {
  StreamableMethod,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";
import { createReconnectingSseStream, EventMessage } from "@azure/core-sse";

export function _receiveSend(
  context: Client,
  id: string,
  customHeader: string,
  options: ReceiveOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/receive/{id}{?lastEventId}",
    {
      id: id,
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
  options: ReceiveOptionalParams = { requestOptions: {} },
): Promise<AsyncIterable<Info>> {
  const descriptors: SseEventDescriptor<Info>[] = [
    {
      isTerminal: false,
      deserialize: (data) => infoDeserializer(data),
      contentType: "application/json",
    },
  ];
  const eventStream = await createReconnectingSseStream(
    async ({ abortSignal, lastEventId }) => {
      const headers = { ...options.requestOptions?.headers };
      for (const headerName of Object.keys(headers)) {
        if (headerName.toLowerCase() === "last-event-id") {
          delete headers[headerName];
        }
      }
      if (lastEventId !== undefined) {
        headers["Last-Event-ID"] = lastEventId;
      }
      const attemptOptions = {
        ...options,
        abortSignal,
        requestOptions: {
          ...options.requestOptions,
          headers: headers,
        },
      };
      return getSseResponse(_receiveSend(context, id, customHeader, attemptOptions));
    },
    {
      abortSignal: options.abortSignal,
      lastEventId: options.lastEventId_1,
      retryDelayInMs: options.retryDelayInMs,
      maxRetries: options.maxRetries,
      validateResponse: async (result) => {
        if (result.status === "204") {
          return "stop";
        }
        const expectedStatuses = ["200"];
        if (!expectedStatuses.includes(result.status)) {
          result = await parseSseErrorResponse(result);
          throw createRestError(result);
        }
        const contentType = Object.entries(result.headers)
          .find(([name]) => name.toLowerCase() === "content-type")?.[1]
          ?.split(";", 1)[0]
          .trim()
          .toLowerCase();
        if (contentType !== "text/event-stream" || !result.body) {
          throw createRestError(result);
        }
        return "accept";
      },
      isTerminalEvent: (event) => isTerminalSseEvent(event, descriptors),
    },
  );
  return _receiveDeserialize(eventStream, descriptors);
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
import { getSseResponse, parseSseErrorResponse } from "../static-helpers/getSseResponse.js";
import {
  SseEventDescriptor,
  readSseStream,
  isTerminalSseEvent,
} from "../static-helpers/sseStreamingHelpers.js";
import { ReceiveOptionalParams } from "./options.js";
import {
  StreamableMethod,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";
import { createReconnectingSseStream, EventMessage } from "@azure/core-sse";

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
  >[],
): Promise<
  AsyncIterable<
    | { event: "responseCreated"; data: ResponseCreated }
    | { event: "responseDelta"; data: ResponseDelta }
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
  >
> {
  const descriptors: SseEventDescriptor<
    | { event: "responseCreated"; data: ResponseCreated }
    | { event: "responseDelta"; data: ResponseDelta }
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
    { isTerminal: true, terminalValue: "[DONE]" },
  ];
  const eventStream = await createReconnectingSseStream(
    async ({ abortSignal, lastEventId }) => {
      const headers = { ...options.requestOptions?.headers };
      for (const headerName of Object.keys(headers)) {
        if (headerName.toLowerCase() === "last-event-id") {
          delete headers[headerName];
        }
      }
      if (lastEventId !== undefined) {
        headers["Last-Event-ID"] = lastEventId;
      }
      const attemptOptions = {
        ...options,
        abortSignal,
        requestOptions: {
          ...options.requestOptions,
          headers: headers,
        },
      };
      return getSseResponse(_receiveSend(context, attemptOptions));
    },
    {
      abortSignal: options.abortSignal,
      lastEventId: options.lastEventId,
      retryDelayInMs: options.retryDelayInMs,
      maxRetries: options.maxRetries,
      validateResponse: async (result) => {
        if (result.status === "204") {
          return "stop";
        }
        const expectedStatuses = ["200"];
        if (!expectedStatuses.includes(result.status)) {
          result = await parseSseErrorResponse(result);
          throw createRestError(result);
        }
        const contentType = Object.entries(result.headers)
          .find(([name]) => name.toLowerCase() === "content-type")?.[1]
          ?.split(";", 1)[0]
          .trim()
          .toLowerCase();
        if (contentType !== "text/event-stream" || !result.body) {
          throw createRestError(result);
        }
        return "accept";
      },
      isTerminalEvent: (event) => isTerminalSseEvent(event, descriptors),
    },
  );
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
import { getSseResponse, parseSseErrorResponse } from "../static-helpers/getSseResponse.js";
import {
  SseEventDescriptor,
  readSseStream,
  isTerminalSseEvent,
} from "../static-helpers/sseStreamingHelpers.js";
import { ReceiveOptionalParams } from "./options.js";
import {
  StreamableMethod,
  createRestError,
  operationOptionsToRequestParameters,
} from "@azure-rest/core-client";
import { createReconnectingSseStream, EventMessage } from "@azure/core-sse";

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
  const eventStream = await createReconnectingSseStream(
    async ({ abortSignal, lastEventId }) => {
      const headers = { ...options.requestOptions?.headers };
      for (const headerName of Object.keys(headers)) {
        if (headerName.toLowerCase() === "last-event-id") {
          delete headers[headerName];
        }
      }
      if (lastEventId !== undefined) {
        headers["Last-Event-ID"] = lastEventId;
      }
      const attemptOptions = {
        ...options,
        abortSignal,
        requestOptions: {
          ...options.requestOptions,
          headers: headers,
        },
      };
      return getSseResponse(_receiveSend(context, attemptOptions));
    },
    {
      abortSignal: options.abortSignal,
      lastEventId: options.lastEventId,
      retryDelayInMs: options.retryDelayInMs,
      maxRetries: options.maxRetries,
      validateResponse: async (result) => {
        if (result.status === "204") {
          return "stop";
        }
        const expectedStatuses = ["200"];
        if (!expectedStatuses.includes(result.status)) {
          result = await parseSseErrorResponse(result);
          throw createRestError(result);
        }
        const contentType = Object.entries(result.headers)
          .find(([name]) => name.toLowerCase() === "content-type")?.[1]
          ?.split(";", 1)[0]
          .trim()
          .toLowerCase();
        if (contentType !== "text/event-stream" || !result.body) {
          throw createRestError(result);
        }
        return "accept";
      },
      isTerminalEvent: (event) => isTerminalSseEvent(event, descriptors),
    },
  );
  return _receiveDeserialize(eventStream, descriptors);
}
```
