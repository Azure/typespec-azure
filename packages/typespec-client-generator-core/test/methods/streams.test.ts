import { resolvePath } from "@typespec/compiler";
import { createTester } from "@typespec/compiler/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { describe, it } from "vitest";
import { UsageFlags } from "../../src/interfaces.js";
import { createSdkContextForTester } from "../tester.js";
import { getServiceMethodOfClient } from "../utils.js";

const StreamsTester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: [
    "@typespec/http",
    "@typespec/rest",
    "@typespec/versioning",
    "@typespec/streams",
    "@typespec/sse",
    "@typespec/events",
    "@azure-tools/typespec-client-generator-core",
  ],
})
  .import(
    "@typespec/http",
    "@typespec/rest",
    "@typespec/versioning",
    "@typespec/http/streams",
    "@typespec/streams",
    "@typespec/sse",
    "@typespec/events",
    "@azure-tools/typespec-client-generator-core",
  )
  .using(
    "Http",
    "Rest",
    "Versioning",
    "TypeSpec.Http.Streams",
    "TypeSpec.Streams",
    "TypeSpec.SSE",
    "TypeSpec.Events",
    "Azure.ClientGenerator.Core",
  );

const StreamsTesterWithBuiltInService = StreamsTester.wrap(
  (x) => `
@service
namespace TestService;

${x}
`,
);

describe("stream request", () => {
  it("http stream request", async () => {
    const { program } = await StreamsTesterWithBuiltInService.compile(
      `
        @route("/")
        op get(stream: HttpStream<Thing, "application/jsonl", string>): void;

        model Thing { id: string }
      `,
    );
    const context = await createSdkContextForTester(program);
    const sdkPackage = context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.parameters[0].type.kind, "model");
    strictEqual(method.parameters[0].type.properties[1].type.kind, "bytes");
    strictEqual(method.parameters[0].type.properties[1].type.encode, "bytes");
    deepStrictEqual(method.operation.bodyParam?.type, method.parameters[0].type.properties[1].type);

    // stream metadata on body param
    const bodyMeta = method.operation.bodyParam?.streamMetadata;
    ok(bodyMeta);
    strictEqual(bodyMeta.bodyType.kind, "string");
    strictEqual(bodyMeta.originalType.kind, "model");
    strictEqual(bodyMeta.originalType.name, "HttpStreamThing");
    strictEqual(bodyMeta.streamType.kind, "model");
    strictEqual(bodyMeta.streamType.name, "Thing");
    deepStrictEqual(bodyMeta.contentTypes, ["application/jsonl"]);

    // streamType has Input + Json usage and appears in sdkPackage.models
    strictEqual(bodyMeta.streamType.usage, UsageFlags.Input | UsageFlags.Json);
    const thingModel = sdkPackage.models.find((m) => m.name === "Thing");
    ok(thingModel);
  });

  it("json stream request", async () => {
    const { program } = await StreamsTesterWithBuiltInService.compile(
      `
        @route("/")
        op get(stream: JsonlStream<Thing>): void;

        model Thing { id: string }
      `,
    );
    const context = await createSdkContextForTester(program);
    const sdkPackage = context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.parameters[0].type.kind, "model");
    strictEqual(method.parameters[0].type.properties[1].type.kind, "bytes");
    strictEqual(method.parameters[0].type.properties[1].type.encode, "bytes");
    deepStrictEqual(method.operation.bodyParam?.type, method.parameters[0].type.properties[1].type);

    // stream metadata on body param
    const bodyMeta = method.operation.bodyParam?.streamMetadata;
    ok(bodyMeta);
    strictEqual(bodyMeta.bodyType.kind, "string");
    strictEqual(bodyMeta.originalType.kind, "model");
    strictEqual(bodyMeta.originalType.name, "JsonlStreamThing");
    strictEqual(bodyMeta.streamType.kind, "model");
    strictEqual(bodyMeta.streamType.name, "Thing");
    deepStrictEqual(bodyMeta.contentTypes, ["application/jsonl"]);

    // JSONL is not an event stream, so no per-event metadata.
    strictEqual(bodyMeta.events, undefined);

    // streamType has Input + Json usage and appears in sdkPackage.models
    strictEqual(bodyMeta.streamType.usage, UsageFlags.Input | UsageFlags.Json);
    ok(sdkPackage.models.find((m) => m.name === "Thing"));
  });

  it("custom stream request", async () => {
    const { program } = await StreamsTesterWithBuiltInService.compile(
      `
        @streamOf(Thing)
        model CustomStream {
          @header contentType: "custom/built-here";
          @body body: bytes;
        }

        @route("/")
        op get(stream: CustomStream): void;

        model Thing { id: string }
      `,
    );
    const context = await createSdkContextForTester(program);
    const sdkPackage = context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.parameters[0].type.kind, "model");
    strictEqual(method.parameters[0].type.properties[1].type.kind, "bytes");
    strictEqual(method.parameters[0].type.properties[1].type.encode, "bytes");
    deepStrictEqual(method.operation.bodyParam?.type, method.parameters[0].type.properties[1].type);

    // stream metadata on body param
    const bodyMeta = method.operation.bodyParam?.streamMetadata;
    ok(bodyMeta);
    strictEqual(bodyMeta.bodyType.kind, "bytes");
    strictEqual(bodyMeta.originalType.kind, "model");
    strictEqual(bodyMeta.originalType.name, "CustomStream");
    strictEqual(bodyMeta.streamType.kind, "model");
    strictEqual(bodyMeta.streamType.name, "Thing");
    deepStrictEqual(bodyMeta.contentTypes, ["custom/built-here"]);

    // streamType has Input usage (no Json since custom content type) and appears in sdkPackage.models
    strictEqual(bodyMeta.streamType.usage, UsageFlags.Input);
    ok(sdkPackage.models.find((m) => m.name === "Thing"));
  });

  it("spread stream request", async () => {
    const { program } = await StreamsTesterWithBuiltInService.compile(
      `
        @route("/")
        op get(...JsonlStream<Thing>): void;

        model Thing { id: string }
      `,
    );
    const context = await createSdkContextForTester(program);
    const sdkPackage = context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.parameters[1].type.kind, "bytes");
    strictEqual(method.parameters[1].type.encode, "bytes");
    deepStrictEqual(method.operation.bodyParam?.type, method.parameters[1].type);

    // stream metadata on body param
    const bodyMeta = method.operation.bodyParam?.streamMetadata;
    ok(bodyMeta);
    strictEqual(bodyMeta.bodyType.kind, "string");
    strictEqual(bodyMeta.originalType.kind, "model");
    strictEqual(bodyMeta.originalType.name, "JsonlStreamThing");
    strictEqual(bodyMeta.streamType.kind, "model");
    strictEqual(bodyMeta.streamType.name, "Thing");
    deepStrictEqual(bodyMeta.contentTypes, ["application/jsonl"]);

    // streamType has Input + Json usage and appears in sdkPackage.models
    strictEqual(bodyMeta.streamType.usage, UsageFlags.Input | UsageFlags.Json);
    ok(sdkPackage.models.find((m) => m.name === "Thing"));
  });

  it("sse request", async () => {
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

    // SSE event metadata: one entry per union variant
    ok(bodyMeta.events);
    strictEqual(bodyMeta.events.length, 4);

    const userconnect = bodyMeta.events[0];
    strictEqual(userconnect.eventType, "userconnect");
    strictEqual(userconnect.isTerminalEvent, false);
    strictEqual(userconnect.isEventEnvelope, false);
    strictEqual(userconnect.type.kind, "model");
    strictEqual(userconnect.type.name, "UserConnect");
    strictEqual(userconnect.payloadType, userconnect.type);
    strictEqual(userconnect.contentType, undefined);

    strictEqual(bodyMeta.events[1].eventType, "usermessage");
    strictEqual(bodyMeta.events[2].eventType, "userdisconnect");

    const unsubscribe = bodyMeta.events[3];
    strictEqual(unsubscribe.eventType, undefined);
    strictEqual(unsubscribe.isTerminalEvent, true);
    strictEqual(unsubscribe.contentType, "text/plain");
  });
});

describe("stream response", () => {
  it("http stream response", async () => {
    const { program } = await StreamsTesterWithBuiltInService.compile(
      `
        @route("/")
        op get(): HttpStream<Thing, "application/jsonl", string>;

        model Thing { id: string }
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

    // stream metadata on HTTP response
    const responseMeta = method.operation.responses[0].streamMetadata;
    ok(responseMeta);
    strictEqual(responseMeta.bodyType.kind, "string");
    strictEqual(responseMeta.originalType.kind, "model");
    strictEqual(responseMeta.originalType.name, "HttpStreamThing");
    strictEqual(responseMeta.streamType.kind, "model");
    strictEqual(responseMeta.streamType.name, "Thing");
    deepStrictEqual(responseMeta.contentTypes, ["application/jsonl"]);

    // stream metadata propagated to method response
    const methodMeta = method.response.streamMetadata;
    ok(methodMeta);
    strictEqual(methodMeta.streamType.kind, "model");
    strictEqual(methodMeta.streamType.name, "Thing");
    deepStrictEqual(methodMeta.contentTypes, ["application/jsonl"]);

    // streamType has Output + Json usage and appears in sdkPackage.models
    strictEqual(responseMeta.streamType.usage, UsageFlags.Output | UsageFlags.Json);
    ok(sdkPackage.models.find((m) => m.name === "Thing"));
  });

  it("json stream response", async () => {
    const { program } = await StreamsTesterWithBuiltInService.compile(
      `
        @route("/")
        op get(): JsonlStream<Thing>;

        model Thing { id: string }
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

    // stream metadata on HTTP response
    const responseMeta = method.operation.responses[0].streamMetadata;
    ok(responseMeta);
    strictEqual(responseMeta.bodyType.kind, "string");
    strictEqual(responseMeta.originalType.kind, "model");
    strictEqual(responseMeta.originalType.name, "JsonlStreamThing");
    strictEqual(responseMeta.streamType.kind, "model");
    strictEqual(responseMeta.streamType.name, "Thing");
    deepStrictEqual(responseMeta.contentTypes, ["application/jsonl"]);

    // stream metadata propagated to method response
    const methodMeta = method.response.streamMetadata;
    ok(methodMeta);
    strictEqual(methodMeta.streamType.kind, "model");
    deepStrictEqual(methodMeta.contentTypes, ["application/jsonl"]);

    // streamType has Output + Json usage and appears in sdkPackage.models
    strictEqual(responseMeta.streamType.usage, UsageFlags.Output | UsageFlags.Json);
    ok(sdkPackage.models.find((m) => m.name === "Thing"));
  });

  it("custom stream response", async () => {
    const { program } = await StreamsTesterWithBuiltInService.compile(
      `
        @streamOf(Thing)
        model CustomStream {
          @header contentType: "custom/built-here";
          @body body: bytes;
        }

        @route("/")
        op get(): CustomStream;

        model Thing { id: string }
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

    // stream metadata on HTTP response
    const responseMeta = method.operation.responses[0].streamMetadata;
    ok(responseMeta);
    strictEqual(responseMeta.bodyType.kind, "bytes");
    strictEqual(responseMeta.originalType.kind, "model");
    strictEqual(responseMeta.originalType.name, "CustomStream");
    strictEqual(responseMeta.streamType.kind, "model");
    strictEqual(responseMeta.streamType.name, "Thing");
    deepStrictEqual(responseMeta.contentTypes, ["custom/built-here"]);

    // stream metadata propagated to method response
    const methodMeta = method.response.streamMetadata;
    ok(methodMeta);
    strictEqual(methodMeta.streamType.kind, "model");
    deepStrictEqual(methodMeta.contentTypes, ["custom/built-here"]);

    // streamType has Output usage (no Json since custom content type) and appears in sdkPackage.models
    strictEqual(responseMeta.streamType.usage, UsageFlags.Output);
    ok(sdkPackage.models.find((m) => m.name === "Thing"));
  });

  it("intersection stream response", async () => {
    const { program } = await StreamsTesterWithBuiltInService.compile(
      `
        @route("/")
        op get(): JsonlStream<Thing> & { @statusCode statusCode: 204; };

        model Thing { id: string }
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

    // stream metadata on HTTP response
    const responseMeta = method.operation.responses[0].streamMetadata;
    ok(responseMeta);
    strictEqual(responseMeta.bodyType.kind, "string");
    strictEqual(responseMeta.originalType.kind, "model");
    strictEqual(responseMeta.originalType.name, "JsonlStreamThing");
    strictEqual(responseMeta.streamType.kind, "model");
    strictEqual(responseMeta.streamType.name, "Thing");
    deepStrictEqual(responseMeta.contentTypes, ["application/jsonl"]);

    // stream metadata propagated to method response
    const methodMeta = method.response.streamMetadata;
    ok(methodMeta);
    strictEqual(methodMeta.streamType.kind, "model");
    deepStrictEqual(methodMeta.contentTypes, ["application/jsonl"]);

    // streamType has Output + Json usage and appears in sdkPackage.models
    strictEqual(responseMeta.streamType.usage, UsageFlags.Output | UsageFlags.Json);
    ok(sdkPackage.models.find((m) => m.name === "Thing"));
  });

  it("sse response", async () => {
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

    // SSE event metadata: one entry per union variant, propagated to method response
    ok(responseMeta.events);
    strictEqual(responseMeta.events.length, 4);
    strictEqual(responseMeta.events[0].eventType, "userconnect");
    strictEqual(responseMeta.events[0].type.kind, "model");
    strictEqual(responseMeta.events[0].type.name, "UserConnect");
    strictEqual(responseMeta.events[3].eventType, undefined);
    strictEqual(responseMeta.events[3].isTerminalEvent, true);
    strictEqual(responseMeta.events[3].contentType, "text/plain");

    ok(methodMeta.events);
    strictEqual(methodMeta.events.length, 4);
    strictEqual(methodMeta.events[3].isTerminalEvent, true);
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
    ok(responseMeta.events);
    strictEqual(responseMeta.events.length, 1);

    const event = responseMeta.events[0];
    strictEqual(event.eventType, undefined); // unnamed variant => `message` event
    strictEqual(event.isTerminalEvent, false);
    strictEqual(event.isEventEnvelope, false);
    strictEqual(event.type.kind, "model");
    strictEqual(event.type.name, "Info");
    strictEqual(event.payloadType, event.type);
    strictEqual(event.contentType, "application/json");
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

    const responseMeta = method.operation.responses[0].streamMetadata;
    ok(responseMeta);
    ok(responseMeta.events);
    strictEqual(responseMeta.events.length, 3);

    strictEqual(responseMeta.events[0].eventType, "responseCreated");
    strictEqual(responseMeta.events[0].type.kind, "model");
    strictEqual(responseMeta.events[0].type.name, "ResponseCreated");
    strictEqual(responseMeta.events[0].isTerminalEvent, false);

    strictEqual(responseMeta.events[1].eventType, "responseDelta");

    const terminal = responseMeta.events[2];
    strictEqual(terminal.eventType, undefined);
    strictEqual(terminal.isTerminalEvent, true);
    strictEqual(terminal.contentType, "text/plain");
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

    // The response is the SSE stream, with per-event metadata.
    const responseMeta = method.operation.responses[0].streamMetadata;
    ok(responseMeta);
    deepStrictEqual(responseMeta.contentTypes, ["text/event-stream"]);
    ok(responseMeta.events);
    strictEqual(responseMeta.events.length, 3);
    strictEqual(responseMeta.events[0].eventType, "partialResult");
    strictEqual(responseMeta.events[1].eventType, "finalResult");
    strictEqual(responseMeta.events[2].isTerminalEvent, true);
  });
});
