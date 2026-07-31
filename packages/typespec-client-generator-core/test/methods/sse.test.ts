import { deepStrictEqual, ok, strictEqual } from "assert";
import { describe, it } from "vitest";
import { UsageFlags } from "../../src/interfaces.js";
import { createSdkContextForTester, StreamsTesterWithBuiltInService } from "../tester.js";
import { getServiceMethodOfClient } from "../utils.js";

describe("sse request", () => {
  it("sse request with heterogeneous events", async () => {
    const { program } = await StreamsTesterWithBuiltInService.compile(
      `
        model UserConnect {
          username: string;
          time: string;
        }

        model UserMessage {
          username: string;
          time: string;
          text: string;
        }

        model UserDisconnect {
          username: string;
          time: string;
        }

        @Events.events
        union ChannelEvents {
          userconnect: UserConnect,
          usermessage: UserMessage,
          userdisconnect: UserDisconnect,

          @Events.contentType("text/plain")
          @terminalEvent
          "[unsubscribe]",
        }

        op subscribeToChannel(stream: SSEStream<ChannelEvents>): void;
      `,
    );
    const context = await createSdkContextForTester(program);
    const sdkPackage = context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.parameters[0].type.kind, "model");
    strictEqual(method.parameters[0].type.properties[1].type.kind, "bytes");
    strictEqual(method.parameters[0].type.properties[1].type.encode, "bytes");
    deepStrictEqual(method.operation.bodyParam?.type, method.parameters[0].type.properties[1].type);

    // stream metadata on body param - SSE streams have union streamType
    const bodyMeta = method.operation.bodyParam?.streamMetadata;
    ok(bodyMeta);
    strictEqual(bodyMeta.bodyType.kind, "string");
    strictEqual(bodyMeta.originalType.kind, "model");
    strictEqual(bodyMeta.originalType.name, "SSEStreamChannelEvents");
    strictEqual(bodyMeta.streamType.kind, "union");
    strictEqual(bodyMeta.streamType.name, "ChannelEvents");
    deepStrictEqual(bodyMeta.contentTypes, ["text/event-stream"]);

    // streamType union has Input usage (no Json since SSE uses text/event-stream)
    strictEqual(bodyMeta.streamType.usage, UsageFlags.Input);

    // SSE event metadata lives on a separate sseMetadata, not on streamMetadata.
    const sseMeta = method.operation.bodyParam?.sseMetadata;
    ok(sseMeta);
    strictEqual(sseMeta.events.length, 4);

    const userconnect = sseMeta.events[0];
    strictEqual(userconnect.eventType, "userconnect");
    strictEqual(userconnect.isTerminalEvent, false);
    strictEqual(userconnect.isEventEnvelope, false);
    strictEqual(userconnect.type.kind, "model");
    strictEqual(userconnect.type.name, "UserConnect");
    strictEqual(userconnect.payloadType, userconnect.type);
    // No @Events.contentType decorator => contentType is undefined
    strictEqual(userconnect.contentType, undefined);

    strictEqual(sseMeta.events[1].eventType, "usermessage");
    strictEqual(sseMeta.events[2].eventType, "userdisconnect");

    // Terminal event: the type is a constant representing the literal value "[unsubscribe]"
    const unsubscribe = sseMeta.events[3];
    strictEqual(unsubscribe.eventType, undefined);
    strictEqual(unsubscribe.isTerminalEvent, true);
    strictEqual(unsubscribe.contentType, "text/plain");
    strictEqual(unsubscribe.type.kind, "constant");
    strictEqual(unsubscribe.type.value, "[unsubscribe]");
  });
});

describe("sse response", () => {
  it("sse response with heterogeneous events and terminal event", async () => {
    const { program } = await StreamsTesterWithBuiltInService.compile(
      `
        model UserConnect {
          username: string;
          time: string;
        }

        model UserMessage {
          username: string;
          time: string;
          text: string;
        }

        model UserDisconnect {
          username: string;
          time: string;
        }

        @Events.events
        union ChannelEvents {
          userconnect: UserConnect,
          usermessage: UserMessage,
          userdisconnect: UserDisconnect,

          @Events.contentType("text/plain")
          @terminalEvent
          "[unsubscribe]",
        }

        op subscribeToChannel(): SSEStream<ChannelEvents>;
      `,
    );
    const context = await createSdkContextForTester(program);
    const sdkPackage = context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.response.type?.kind, "bytes");
    strictEqual(method.response.type?.encode, "bytes");
    strictEqual(method.operation.responses.length, 1);
    strictEqual(method.operation.responses[0].type?.kind, "bytes");
    strictEqual(method.operation.responses[0].type?.encode, "bytes");

    // stream metadata on HTTP response - SSE streams have union streamType
    const responseMeta = method.operation.responses[0].streamMetadata;
    ok(responseMeta);
    strictEqual(responseMeta.bodyType.kind, "string");
    strictEqual(responseMeta.originalType.kind, "model");
    strictEqual(responseMeta.originalType.name, "SSEStreamChannelEvents");
    strictEqual(responseMeta.streamType.kind, "union");
    strictEqual(responseMeta.streamType.name, "ChannelEvents");
    deepStrictEqual(responseMeta.contentTypes, ["text/event-stream"]);

    // stream metadata propagated to method response
    const methodMeta = method.response.streamMetadata;
    ok(methodMeta);
    strictEqual(methodMeta.streamType.kind, "union");
    strictEqual(methodMeta.streamType.name, "ChannelEvents");
    deepStrictEqual(methodMeta.contentTypes, ["text/event-stream"]);

    // streamType union has Output usage (no Json since SSE uses text/event-stream)
    strictEqual(responseMeta.streamType.usage, UsageFlags.Output);

    // Event variant models have Output + Json usage (model type => inferred application/json)
    const responseSse = method.operation.responses[0].sseMetadata;
    ok(responseSse);
    strictEqual(responseSse.events.length, 4);
    strictEqual(responseSse.events[0].eventType, "userconnect");
    strictEqual(responseSse.events[0].type.kind, "model");
    strictEqual(responseSse.events[0].type.name, "UserConnect");
    // No @Events.contentType set => contentType is undefined, but model type => inferred Json
    strictEqual(responseSse.events[0].contentType, undefined);
    strictEqual((responseSse.events[0].type as any).usage, UsageFlags.Output | UsageFlags.Json);
    ok((responseSse.events[0].type as any).serializationOptions.json);

    // Terminal event has constant type with the literal value
    const terminal = responseSse.events[3];
    strictEqual(terminal.eventType, undefined);
    strictEqual(terminal.isTerminalEvent, true);
    strictEqual(terminal.contentType, "text/plain");
    strictEqual(terminal.type.kind, "constant");
    strictEqual(terminal.type.value, "[unsubscribe]");

    const methodSse = method.response.sseMetadata;
    ok(methodSse);
    strictEqual(methodSse.events.length, 4);
    strictEqual(methodSse.events[3].isTerminalEvent, true);
  });
});

// These mirror the SSE scenarios added to the http-specs spector suite
// (streaming/sse): a basic unnamed `message` stream, a named-events stream with a
// terminal event, and a POST whose response is an SSE stream.
describe("sse scenarios (mirroring spector streaming/sse)", () => {
  it("basic: unnamed message events", async () => {
    const { program } = await StreamsTesterWithBuiltInService.compile(
      `
        model Info {
          desc: string;
        }

        @Events.events
        union BasicEvents {
          @Events.contentType("application/json")
          Info,
        }

        op receive(): SSEStream<BasicEvents>;
      `,
    );
    const context = await createSdkContextForTester(program);
    const method = getServiceMethodOfClient(context.sdkPackage);

    const responseMeta = method.operation.responses[0].streamMetadata;
    ok(responseMeta);
    deepStrictEqual(responseMeta.contentTypes, ["text/event-stream"]);

    const responseSse = method.operation.responses[0].sseMetadata;
    ok(responseSse);
    strictEqual(responseSse.events.length, 1);

    const event = responseSse.events[0];
    strictEqual(event.eventType, undefined); // unnamed variant => `message` event
    strictEqual(event.isTerminalEvent, false);
    strictEqual(event.isEventEnvelope, false);
    strictEqual(event.type.kind, "model");
    strictEqual(event.type.name, "Info");
    strictEqual(event.payloadType, event.type);
    strictEqual(event.contentType, "application/json");

    // Event model gets Json usage because its contentType is application/json
    strictEqual((event.type as any).usage, UsageFlags.Output | UsageFlags.Json);
  });

  it("named events with a terminal event", async () => {
    const { program } = await StreamsTesterWithBuiltInService.compile(
      `
        model ResponseCreated {
          id: string;
        }

        model ResponseDelta {
          delta: string;
        }

        @Events.events
        union ResponseEvents {
          @Events.contentType("application/json")
          responseCreated: ResponseCreated,

          @Events.contentType("application/json")
          responseDelta: ResponseDelta,

          @Events.contentType("text/plain")
          @terminalEvent
          "[DONE]",
        }

        op receive(): SSEStream<ResponseEvents>;
      `,
    );
    const context = await createSdkContextForTester(program);
    const method = getServiceMethodOfClient(context.sdkPackage);

    const responseSse = method.operation.responses[0].sseMetadata;
    ok(responseSse);
    strictEqual(responseSse.events.length, 3);

    strictEqual(responseSse.events[0].eventType, "responseCreated");
    strictEqual(responseSse.events[0].type.kind, "model");
    strictEqual(responseSse.events[0].type.name, "ResponseCreated");
    strictEqual(responseSse.events[0].isTerminalEvent, false);
    // JSON event models get Json usage
    strictEqual((responseSse.events[0].type as any).usage, UsageFlags.Output | UsageFlags.Json);

    strictEqual(responseSse.events[1].eventType, "responseDelta");
    strictEqual((responseSse.events[1].type as any).usage, UsageFlags.Output | UsageFlags.Json);

    // Terminal event: type is a constant with the "[DONE]" value
    const terminal = responseSse.events[2];
    strictEqual(terminal.eventType, undefined);
    strictEqual(terminal.isTerminalEvent, true);
    strictEqual(terminal.contentType, "text/plain");
    strictEqual(terminal.type.kind, "constant");
    strictEqual(terminal.type.value, "[DONE]");
  });

  it("POST with a request body and an SSE-streamed response", async () => {
    const { program } = await StreamsTesterWithBuiltInService.compile(
      `
        model RetrievalRequest {
          query: string;
        }

        model PartialResult {
          text: string;
        }

        model FinalResult {
          references: string[];
        }

        @Events.events
        union RetrievalEvents {
          @Events.contentType("application/json")
          partialResult: PartialResult,

          @Events.contentType("application/json")
          finalResult: FinalResult,

          @Events.contentType("text/plain")
          @terminalEvent
          "[DONE]",
        }

        @post
        op stream(@body request: RetrievalRequest): SSEStream<RetrievalEvents>;
      `,
    );
    const context = await createSdkContextForTester(program);
    const method = getServiceMethodOfClient(context.sdkPackage);

    // The request body is a plain model, not a stream.
    strictEqual(method.operation.bodyParam?.type.kind, "model");
    strictEqual(method.operation.bodyParam?.type.name, "RetrievalRequest");
    strictEqual(method.operation.bodyParam?.streamMetadata, undefined);
    strictEqual(method.operation.bodyParam?.sseMetadata, undefined);

    // The response is the SSE stream, with per-event metadata.
    const responseMeta = method.operation.responses[0].streamMetadata;
    ok(responseMeta);
    deepStrictEqual(responseMeta.contentTypes, ["text/event-stream"]);

    const responseSse = method.operation.responses[0].sseMetadata;
    ok(responseSse);
    strictEqual(responseSse.events.length, 3);
    strictEqual(responseSse.events[0].eventType, "partialResult");
    strictEqual(responseSse.events[1].eventType, "finalResult");
    strictEqual(responseSse.events[2].isTerminalEvent, true);
    // Terminal constant is accessible via type
    strictEqual(responseSse.events[2].type.kind, "constant");
    strictEqual(responseSse.events[2].type.value, "[DONE]");

    // Request model has Input + Json usage
    strictEqual(method.operation.bodyParam?.type.usage, UsageFlags.Input | UsageFlags.Json);
    // Response event models have Output + Json usage
    strictEqual((responseSse.events[0].type as any).usage, UsageFlags.Output | UsageFlags.Json);
    strictEqual((responseSse.events[1].type as any).usage, UsageFlags.Output | UsageFlags.Json);
  });
});

describe("sse event envelope", () => {
  it("event with @data payload uses envelope and payload types", async () => {
    const { program } = await StreamsTesterWithBuiltInService.compile(
      `
        model ChatMessage {
          role: string;
          content: string;
        }

        @Events.events
        union ChatEvents {
          @Events.contentType("application/json")
          message: { done: false, @Events.data message: ChatMessage },

          @Events.contentType("text/plain")
          @terminalEvent
          done: { done: true },
        }

        op chat(): SSEStream<ChatEvents>;
      `,
    );
    const context = await createSdkContextForTester(program);
    const method = getServiceMethodOfClient(context.sdkPackage);

    const responseSse = method.operation.responses[0].sseMetadata;
    ok(responseSse);
    strictEqual(responseSse.events.length, 2);

    const messageEvent = responseSse.events[0];
    strictEqual(messageEvent.eventType, "message");
    strictEqual(messageEvent.isTerminalEvent, false);
    strictEqual(messageEvent.isEventEnvelope, true);
    // The type is the envelope model
    strictEqual(messageEvent.type.kind, "model");
    // The payloadType is the @data-decorated property's type
    strictEqual(messageEvent.payloadType.kind, "model");
    strictEqual(messageEvent.payloadType.name, "ChatMessage");
    // Envelope content type is JSON
    strictEqual(messageEvent.contentType, "application/json");

    const doneEvent = responseSse.events[1];
    strictEqual(doneEvent.eventType, "done");
    strictEqual(doneEvent.isTerminalEvent, true);
    strictEqual(doneEvent.isEventEnvelope, false);
  });
});

describe("sse usage and access propagation", () => {
  it("propagates Json usage to event models with application/json content type", async () => {
    const { program } = await StreamsTesterWithBuiltInService.compile(
      `
        model EventA {
          value: string;
        }

        model EventB {
          count: int32;
        }

        @Events.events
        union MyEvents {
          @Events.contentType("application/json")
          eventA: EventA,

          @Events.contentType("application/json")
          eventB: EventB,
        }

        op subscribe(): SSEStream<MyEvents>;
      `,
    );
    const context = await createSdkContextForTester(program);
    const sdkPackage = context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);

    const responseSse = method.operation.responses[0].sseMetadata;
    ok(responseSse);

    // Both event types get Output + Json usage
    strictEqual((responseSse.events[0].type as any).usage, UsageFlags.Output | UsageFlags.Json);
    strictEqual((responseSse.events[1].type as any).usage, UsageFlags.Output | UsageFlags.Json);

    // Serialization options are set on event models
    ok((responseSse.events[0].type as any).serializationOptions.json);
    ok((responseSse.events[1].type as any).serializationOptions.json);

    // They also appear in sdkPackage.models
    ok(sdkPackage.models.find((m) => m.name === "EventA"));
    ok(sdkPackage.models.find((m) => m.name === "EventB"));
  });

  it("does not propagate Json usage when event has non-json content type", async () => {
    const { program } = await StreamsTesterWithBuiltInService.compile(
      `
        model TextEvent {
          text: string;
        }

        @Events.events
        union TextEvents {
          @Events.contentType("text/plain")
          textEvent: TextEvent,
        }

        op subscribe(): SSEStream<TextEvents>;
      `,
    );
    const context = await createSdkContextForTester(program);
    const method = getServiceMethodOfClient(context.sdkPackage);

    const responseSse = method.operation.responses[0].sseMetadata;
    ok(responseSse);

    // text/plain content type => no Json usage, only Output
    strictEqual((responseSse.events[0].type as any).usage, UsageFlags.Output);
  });

  it("infers application/json for model events with no explicit content type", async () => {
    const { program } = await StreamsTesterWithBuiltInService.compile(
      `
        model SimpleEvent {
          data: string;
        }

        @Events.events
        union SimpleEvents {
          simpleEvent: SimpleEvent,
        }

        op subscribe(): SSEStream<SimpleEvents>;
      `,
    );
    const context = await createSdkContextForTester(program);
    const method = getServiceMethodOfClient(context.sdkPackage);

    const responseSse = method.operation.responses[0].sseMetadata;
    ok(responseSse);

    // No explicit contentType, but model type => inferred application/json => Json usage + serialization
    strictEqual((responseSse.events[0].type as any).usage, UsageFlags.Output | UsageFlags.Json);
    ok((responseSse.events[0].type as any).serializationOptions.json);
  });

  it("propagates Json usage to @data payload type in envelope events", async () => {
    const { program } = await StreamsTesterWithBuiltInService.compile(
      `
        model Payload {
          value: string;
        }

        @Events.events
        union EnvelopeEvents {
          @Events.contentType("application/json")
          wrapped: { done: false, @Events.data payload: Payload },
        }

        op subscribe(): SSEStream<EnvelopeEvents>;
      `,
    );
    const context = await createSdkContextForTester(program);
    const method = getServiceMethodOfClient(context.sdkPackage);

    const responseSse = method.operation.responses[0].sseMetadata;
    ok(responseSse);

    const event = responseSse.events[0];
    strictEqual(event.isEventEnvelope, true);
    // Both the envelope type and the payload type get Json usage
    strictEqual((event.type as any).usage, UsageFlags.Output | UsageFlags.Json);
    strictEqual((event.payloadType as any).usage, UsageFlags.Output | UsageFlags.Json);
    // Serialization options set on both envelope and payload types
    ok((event.type as any).serializationOptions.json);
    ok((event.payloadType as any).serializationOptions.json);
  });

  it("propagates access to event models", async () => {
    const { program } = await StreamsTesterWithBuiltInService.compile(
      `
        model PublicEvent {
          message: string;
        }

        @Events.events
        union PublicEvents {
          @Events.contentType("application/json")
          publicEvent: PublicEvent,
        }

        op subscribe(): SSEStream<PublicEvents>;
      `,
    );
    const context = await createSdkContextForTester(program);
    const sdkPackage = context.sdkPackage;

    // Event model gets public access
    const publicEventModel = sdkPackage.models.find((m) => m.name === "PublicEvent");
    ok(publicEventModel);
    strictEqual(publicEventModel.access, "public");
  });

  it("propagates Input + Json usage for SSE request with json content type events", async () => {
    const { program } = await StreamsTesterWithBuiltInService.compile(
      `
        model InputEvent {
          data: string;
        }

        @Events.events
        union InputEvents {
          @Events.contentType("application/json")
          inputEvent: InputEvent,
        }

        op send(stream: SSEStream<InputEvents>): void;
      `,
    );
    const context = await createSdkContextForTester(program);
    const method = getServiceMethodOfClient(context.sdkPackage);

    const sseMeta = method.operation.bodyParam?.sseMetadata;
    ok(sseMeta);

    // Input event model gets Input + Json usage
    strictEqual((sseMeta.events[0].type as any).usage, UsageFlags.Input | UsageFlags.Json);
  });
});

describe("sse with HttpStream", () => {
  it("HttpStream with text/event-stream content type and @events union", async () => {
    const { program } = await StreamsTesterWithBuiltInService.compile(
      `
        model Notification {
          id: string;
          message: string;
        }

        @Events.events
        union NotificationEvents {
          @Events.contentType("application/json")
          notification: Notification,

          @Events.contentType("text/plain")
          @terminalEvent
          "[END]",
        }

        op subscribe(): HttpStream<NotificationEvents, "text/event-stream">;
      `,
    );
    const context = await createSdkContextForTester(program);
    const method = getServiceMethodOfClient(context.sdkPackage);

    const responseMeta = method.operation.responses[0].streamMetadata;
    ok(responseMeta);
    deepStrictEqual(responseMeta.contentTypes, ["text/event-stream"]);
    strictEqual(responseMeta.streamType.kind, "union");
    strictEqual(responseMeta.streamType.name, "NotificationEvents");

    const responseSse = method.operation.responses[0].sseMetadata;
    ok(responseSse);
    strictEqual(responseSse.events.length, 2);
    strictEqual(responseSse.events[0].eventType, "notification");
    strictEqual(responseSse.events[0].type.name, "Notification");
    strictEqual(responseSse.events[1].isTerminalEvent, true);
    // Terminal constant accessible
    strictEqual(responseSse.events[1].type.kind, "constant");
    strictEqual(responseSse.events[1].type.value, "[END]");

    // Notification model gets Output + Json usage
    strictEqual((responseSse.events[0].type as any).usage, UsageFlags.Output | UsageFlags.Json);
  });
});
