import { resolvePath } from "@typespec/compiler";
import { createTester } from "@typespec/compiler/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { describe, it } from "vitest";
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
  });
});
