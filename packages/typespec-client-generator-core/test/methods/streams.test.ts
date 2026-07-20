import { deepStrictEqual, ok, strictEqual } from "assert";
import { describe, it } from "vitest";
import { UsageFlags } from "../../src/interfaces.js";
import { createSdkContextForTester, StreamsTesterWithBuiltInService } from "../tester.js";
import { getServiceMethodOfClient } from "../utils.js";

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

    // JSONL is not an event stream, so no SSE metadata.
    strictEqual(method.operation.bodyParam?.sseMetadata, undefined);

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
});
