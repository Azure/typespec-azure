import { resolvePath } from "@typespec/compiler";
import { createTester } from "@typespec/compiler/testing";
import { deepStrictEqual, strictEqual } from "assert";
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
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const sdkPackage = context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(sdkPackage.models.length, 0);
    strictEqual(method.parameters[0].type.kind, "model");
    strictEqual(method.parameters[0].type.properties[1].type.kind, "bytes");
    strictEqual(method.parameters[0].type.properties[1].type.encode, "bytes");
    deepStrictEqual(method.operation.bodyParam?.type, method.parameters[0].type.properties[1].type);
  });

  it("json stream request", async () => {
    const { program } = await StreamsTesterWithBuiltInService.compile(
      `
        @route("/")
        op get(stream: JsonlStream<Thing>): void;

        model Thing { id: string }
      `,
    );
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const sdkPackage = context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(sdkPackage.models.length, 0);
    strictEqual(method.parameters[0].type.kind, "model");
    strictEqual(method.parameters[0].type.properties[1].type.kind, "bytes");
    strictEqual(method.parameters[0].type.properties[1].type.encode, "bytes");
    deepStrictEqual(method.operation.bodyParam?.type, method.parameters[0].type.properties[1].type);
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
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const sdkPackage = context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(sdkPackage.models.length, 0);
    strictEqual(method.parameters[0].type.kind, "model");
    strictEqual(method.parameters[0].type.properties[1].type.kind, "bytes");
    strictEqual(method.parameters[0].type.properties[1].type.encode, "bytes");
    deepStrictEqual(method.operation.bodyParam?.type, method.parameters[0].type.properties[1].type);
  });

  it("spread stream request", async () => {
    const { program } = await StreamsTesterWithBuiltInService.compile(
      `
        @route("/")
        op get(...JsonlStream<Thing>): void;

        model Thing { id: string }
      `,
    );
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const sdkPackage = context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(sdkPackage.models.length, 0);
    strictEqual(method.parameters[1].type.kind, "bytes");
    strictEqual(method.parameters[1].type.encode, "bytes");
    deepStrictEqual(method.operation.bodyParam?.type, method.parameters[1].type);
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
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const sdkPackage = context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(sdkPackage.models.length, 0);
    strictEqual(method.parameters[0].type.kind, "model");
    strictEqual(method.parameters[0].type.properties[1].type.kind, "bytes");
    strictEqual(method.parameters[0].type.properties[1].type.encode, "bytes");
    deepStrictEqual(method.operation.bodyParam?.type, method.parameters[0].type.properties[1].type);
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
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const sdkPackage = context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(sdkPackage.models.length, 0);
    strictEqual(method.response.type?.kind, "bytes");
    strictEqual(method.response.type?.encode, "bytes");
    strictEqual(method.operation.responses.length, 1);
    strictEqual(method.operation.responses[0].type?.kind, "bytes");
    strictEqual(method.operation.responses[0].type?.encode, "bytes");
  });

  it("json stream response", async () => {
    const { program } = await StreamsTesterWithBuiltInService.compile(
      `
        @route("/")
        op get(): JsonlStream<Thing>;

        model Thing { id: string }
      `,
    );
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const sdkPackage = context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(sdkPackage.models.length, 0);
    strictEqual(method.response.type?.kind, "bytes");
    strictEqual(method.response.type?.encode, "bytes");
    strictEqual(method.operation.responses.length, 1);
    strictEqual(method.operation.responses[0].type?.kind, "bytes");
    strictEqual(method.operation.responses[0].type?.encode, "bytes");
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
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const sdkPackage = context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(sdkPackage.models.length, 0);
    strictEqual(method.response.type?.kind, "bytes");
    strictEqual(method.response.type?.encode, "bytes");
    strictEqual(method.operation.responses.length, 1);
    strictEqual(method.operation.responses[0].type?.kind, "bytes");
    strictEqual(method.operation.responses[0].type?.encode, "bytes");
  });

  it("intersection stream response", async () => {
    const { program } = await StreamsTesterWithBuiltInService.compile(
      `
        @route("/")
        op get(): JsonlStream<Thing> & { @statusCode statusCode: 204; };

        model Thing { id: string }
      `,
    );
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const sdkPackage = context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(sdkPackage.models.length, 0);
    strictEqual(method.response.type?.kind, "bytes");
    strictEqual(method.response.type?.encode, "bytes");
    strictEqual(method.operation.responses.length, 1);
    strictEqual(method.operation.responses[0].type?.kind, "bytes");
    strictEqual(method.operation.responses[0].type?.encode, "bytes");
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
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const sdkPackage = context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(sdkPackage.models.length, 0);
    strictEqual(method.response.type?.kind, "bytes");
    strictEqual(method.response.type?.encode, "bytes");
    strictEqual(method.operation.responses.length, 1);
    strictEqual(method.operation.responses[0].type?.kind, "bytes");
    strictEqual(method.operation.responses[0].type?.encode, "bytes");
  });
});
