import { describe, expect, it } from "vitest";
import { ApiTester, EmitterTester, loadQueuePilotFixture } from "./tester.js";

describe("end-to-end emit", () => {
  it("compiles the queue-pilot fixture (base + azurite overlay) without diagnostics and emits all artifacts", async () => {
    const [{ outputs }, diagnostics] =
      await EmitterTester.compileAndDiagnose(loadQueuePilotFixture());

    expect(diagnostics).toEqual([]);

    const fileNames = Object.keys(outputs)
      .map((path) => path.split("/").pop())
      .sort();
    expect(fileNames).toEqual([
      "handlers.ts",
      "metadata.ts",
      "models.ts",
      "operations.ts",
      "serialization.ts",
    ]);
  });

  it("generates models.ts with all referenced data models", async () => {
    const { outputs } = await EmitterTester.compile(loadQueuePilotFixture());
    const modelsFile = findOutput(outputs, "models.ts");

    expect(modelsFile).toContain("export interface AccessPolicy {");
    expect(modelsFile).toContain("export interface QueueMetadata {");
    expect(modelsFile).toContain("export interface QueueProperties {");
    expect(modelsFile).toContain("export interface QueueMessage {");
    expect(modelsFile).toContain("export interface QueueMessageList {");
    expect(modelsFile).toContain("messages: Array<QueueMessage>;");
    expect(modelsFile).toContain("start?: string;");
    expect(modelsFile).toContain("permission?: string;");
    expect(modelsFile).toContain(`["name", "Name", "string", "attribute", undefined, true]`);
    expect(modelsFile).toMatch(
      /"QueueMessagesList",\s*\[\s*\[\s*"messages",\s*"messages",\s*\["array", \["model", "QueueMessage"\]\],\s*"unwrapped",\s*"QueueMessage",\s*true/,
    );
  });

  it("generates metadata.ts with route metadata for all fixture operations", async () => {
    const { outputs } = await EmitterTester.compile(loadQueuePilotFixture());
    const metadataFile = findOutput(outputs, "metadata.ts");
    const operationsFile = findOutput(outputs, "operations.ts");

    expect(metadataFile).toContain(`defineServiceMetadata({`);
    expect(operationsFile).toContain(`export const QueueCreateMetadata = defineOperation([`);
    expect(operationsFile).toContain(`"Queue_Create"`);
    expect(operationsFile).toContain(`"put"`);
    expect(operationsFile).toContain(`"ListMessages"`);
    expect(operationsFile).toContain(`"get"`);
    expect(operationsFile).toContain(`"SetAccessPolicy"`);
    expect(operationsFile).toContain(`"query"`);
    expect(operationsFile).toContain(`"path"`);
    expect(metadataFile).toContain(`from "../runtime/serializationRuntime";`);
    expect(metadataFile).toContain(`QueueCreateMetadata`);
    expect(metadataFile).toContain(`QueueMetadataXmlMetadata`);
    expect(metadataFile).toMatch(
      /export const operations: readonly OperationMetadata\[\] = serviceMetadata\.operations;?/,
    );
    expect(operationsFile).not.toContain(`defineOperations`);
    expect(metadataFile).not.toContain(`"Queue_Create"`);
  });

  it("generates XML model metadata with requiredness for required TypeSpec properties", async () => {
    const { outputs } = await EmitterTester.compile(loadQueuePilotFixture());
    const modelsFile = findOutput(outputs, "models.ts");

    expect(modelsFile).toMatch(
      /SignedIdentifierXmlMetadata[\s\S]*\["id", "id", "string", undefined, undefined, true\]/,
    );
    expect(modelsFile).toMatch(
      /SignedIdentifierXmlMetadata[\s\S]*"accessPolicy"[\s\S]*"accessPolicy"[\s\S]*\["model", "AccessPolicy"\][\s\S]*undefined,[\s\S]*undefined,[\s\S]*true/,
    );
    expect(modelsFile).toMatch(
      /AccessPolicyXmlMetadata[\s\S]*\["start", "start", \["datetime", "rfc3339"\]\][\s\S]*\["expiry", "expiry", \["datetime", "rfc3339"\]\][\s\S]*\["permission", "permission", "string"\]/,
    );
    expect(modelsFile).not.toMatch(
      /AccessPolicyXmlMetadata[\s\S]*\["start", "start", \["datetime", "rfc3339"\], undefined, undefined, true\]/,
    );
  });

  it("generates sparse numeric constraints for operation parameters and XML model properties", async () => {
    const { outputs } = await EmitterTester.compile({
      "main.tsp": `
        import "@typespec/http";
        using Http;

        @service
        namespace NumericConstraintDemo;

        model NumericBody {
          @minValue(1)
          days: int32;

          @maxValueExclusive(60)
          optionalLimit?: int32;

          unconstrained?: int32;
        }

        @route("/items/{id}")
        @put
        op putItem(
          @path
          @minValueExclusive(0)
          id: int32,

          @query
          @minValue(0)
          timeout?: int32 = 30,

          @header("x-count")
          @maxValue(10)
          count: int32,

          @body body: NumericBody,
        ): {
          @statusCode statusCode: 200;

          @header("x-retry-after")
          @maxValue(120)
          retryAfter: int32;

          @body body: NumericBody;
        };
      `,
    });
    const operationsFile = findOutput(outputs, "operations.ts");
    const modelsFile = findOutput(outputs, "models.ts");

    expect(operationsFile).toMatch(/"id"[\s\S]*"path"[\s\S]*"number"[\s\S]*minExclusive: 0/);
    expect(operationsFile).toMatch(/"timeout"[\s\S]*"query"[\s\S]*"number"[\s\S]*min: 0/);
    expect(operationsFile).toMatch(/"count"[\s\S]*"header"[\s\S]*"number"[\s\S]*max: 10/);
    expect(operationsFile).toMatch(
      /"retryAfter"[\s\S]*"x-retry-after"[\s\S]*"number"[\s\S]*max: 120/,
    );
    expect(modelsFile).toMatch(/"days"[\s\S]*"number"[\s\S]*min: 1[\s\S]*true/);
    expect(modelsFile).toMatch(/"optionalLimit"[\s\S]*"number"[\s\S]*maxExclusive: 60/);
    expect(modelsFile).toContain(`["unconstrained", "unconstrained", "number"]`);
  });

  it("imports referenced model types into operations.ts so the file compiles standalone", async () => {
    const { outputs } = await EmitterTester.compile(loadQueuePilotFixture());
    const operationsFile = findOutput(outputs, "operations.ts");

    expect(operationsFile).toMatch(
      /import type \{[^}]*QueueMetadata[^}]*\} from "\.\/models\.js";/,
    );
  });

  it("generates handlers.ts with a method per operation", async () => {
    const { outputs } = await EmitterTester.compile(loadQueuePilotFixture());
    const handlersFile = findOutput(outputs, "handlers.ts");

    expect(handlersFile).toContain("export interface IServiceHandler {");
    expect(handlersFile).toMatch(
      /queueCreate\(\s*params: QueueCreateParameters,\s*context: Context,\s*\): Promise<QueueCreateResponse>;/,
    );
    expect(handlersFile).toMatch(
      /getQueueProperties\(\s*params: GetQueuePropertiesParameters,\s*context: Context,\s*\): Promise<GetQueuePropertiesResponse>;/,
    );
    expect(handlersFile).toMatch(
      /listMessages\(\s*params: ListMessagesParameters,\s*context: Context,\s*\): Promise<ListMessagesResponse>;/,
    );
    expect(handlersFile).toMatch(
      /setAccessPolicy\(\s*params: SetAccessPolicyParameters,\s*context: Context,\s*\): Promise<SetAccessPolicyResponse>;/,
    );
  });

  it("generates thin serialization.ts binding to the Azurite runtime", async () => {
    const { outputs } = await EmitterTester.compile(loadQueuePilotFixture());
    const serializationFile = findOutput(outputs, "serialization.ts");

    expect(serializationFile).not.toContain(`@azure/ms-rest-js`);
    expect(serializationFile).toContain(`createSerializationRuntime`);
    expect(serializationFile).toContain(`import { serviceMetadata } from "./metadata";`);
    expect(serializationFile).toContain(`from "../runtime/serializationRuntime";`);
    expect(serializationFile).toContain(
      `const runtime = createSerializationRuntime(serviceMetadata);`,
    );
    expect(serializationFile).toContain(
      `export const deserializeRequest = runtime.deserializeRequest;`,
    );
    expect(serializationFile).toContain(
      `export const serializeResponse = runtime.serializeResponse;`,
    );
    expect(serializationFile).toContain(
      `export const hasGeneratedSerialization = runtime.hasGeneratedSerialization;`,
    );
    expect(serializationFile).not.toContain(`defineServiceMetadata`);
    expect(serializationFile).not.toContain(`xmlModels`);
    expect(serializationFile).not.toContain(
      `function deserializeDeleteQueueRequest(req: IRequest)`,
    );
    expect(serializationFile).not.toContain(`function serializeDeleteQueueResponse`);
    expect(serializationFile).not.toContain(`function deserializeMetadataRequest`);
    expect(serializationFile).not.toContain(`function serializeMetadataResponse`);
    expect(serializationFile).not.toContain(`function deserializePathParameter`);
    expect(serializationFile).not.toContain(`function serializeXmlModel`);
    expect(serializationFile).not.toContain(`function deserializeXmlModel`);
    expect(serializationFile).not.toContain(`function setHeaderCollection`);
    expect(serializationFile).not.toContain(`switch (name)`);
    expect(serializationFile).not.toContain(`Context`);
    expect(serializationFile).not.toContain(`IHandlerParameters`);
  });

  it("honors the configurable runtime import path in generated artifacts", async () => {
    const customEmitterTester = ApiTester.emit("@azure-tools/typespec-azurite-emitter", {
      runtimeImport: "../custom/runtime.js",
    });
    const { outputs } = await customEmitterTester.compile(loadQueuePilotFixture());

    expect(findOutput(outputs, "metadata.ts")).toContain(`from "../custom/runtime.js";`);
    expect(findOutput(outputs, "models.ts")).toContain(`from "../custom/runtime.js";`);
    expect(findOutput(outputs, "operations.ts")).toContain(`from "../custom/runtime.js";`);
    expect(findOutput(outputs, "serialization.ts")).toContain(`from "../custom/runtime.js";`);
  });
});

describe("emit diagnostics", () => {
  it.each([
    [
      `op run(): { @statusCode @minValue(400) @maxValue(499) code: int32 };`,
      "response status range 400-499",
    ],
    [
      `op run(): { @statusCode code: 200; @body payload: string }
               | { @statusCode code: 200; @body payload: int32 };`,
      "multiple response variants for status 200",
    ],
    [
      `op run(): { @header contentType: "application/xml" | "application/json"; @body payload: Item };`,
      "multiple response content types for status 200",
    ],
    [`op run(@cookie session: string): void;`, "cookie parameter 'session'"],
    [`op run(@multipartBody fields: { item: HttpPart<string> }): void;`, "multipart bodies"],
    [`op run(): Http.File;`, "file bodies"],
  ])("diagnoses %s rather than emitting partial metadata", async (operation, reason) => {
    const [{ outputs }, diagnostics] = await EmitterTester.compileAndDiagnose(`
      import "@typespec/http";
      using Http;
      @service namespace UnsupportedDemo;
      model Item { value: string; }
      ${operation}
    `);
    expect(diagnostics).toMatchObject([
      {
        code: "@azure-tools/typespec-azurite-emitter/unsupported-type",
        message: expect.stringContaining(reason),
      },
    ]);
    expect(outputs).toEqual({});
  });

  it("preserves JSON media types separately from XML model descriptors", async () => {
    const { outputs } = await EmitterTester.compile(`
      import "@typespec/http";
      using Http;
      @service namespace JsonDemo;
      model Item { value: string; }
      @post op run(@body item: Item): Item;
    `);
    const operationsFile = findOutput(outputs, "operations.ts");
    expect(operationsFile).toContain(`[["model", "Item"], ["application/json"]]`);
    expect(operationsFile).toContain(`[200, undefined, ["model", "Item"], "application/json"]`);
  });

  it("emits nullable and mixed union declarations alongside their wire alternatives", async () => {
    const [{ outputs }, diagnostics] = await EmitterTester.compileAndDiagnose({
      "main.tsp": `
        import "@typespec/http";
        using Http;

        @service
        namespace UnsupportedUnionDemo;

        @route("/items")
        @get
        op get(@query value: string | int32, @query maybe: string | null): {
          @statusCode statusCode: 204;
        };
      `,
    });

    expect(diagnostics).toEqual([]);
    const operations = findOutput(outputs, "operations.ts");
    expect(operations).toContain(`value: string | number`);
    expect(operations).toContain(`maybe: string | null`);
    expect(operations).toContain(`["union", ["string", "number"]]`);
    expect(operations).toContain(`["union", ["string", ["literal", null]]]`);
  });

  it("honors datetime property and scalar encodings before HTTP location defaults", async () => {
    const { outputs } = await EmitterTester.compile({
      "main.tsp": `
        import "@typespec/http";
        using Http;
        @service namespace Dates;
        @encode(DateTimeKnownEncoding.unixTimestamp, int32) scalar Epoch extends utcDateTime;
        scalar InheritedEpoch extends Epoch;
        @get op read(@header sent: utcDateTime, @query since: InheritedEpoch): {
          @header modified: offsetDateTime;
          @header day: plainDate;
          @header clock: plainTime;
          @header @encode(DateTimeKnownEncoding.rfc3339) expires: Epoch;
          @header @encode("rfc3339-fixed-width") timestamp: utcDateTime;
        };
      `,
    });
    const operations = findOutput(outputs, "operations.ts");
    expect(operations).toContain(`["sent", "sent", "header", ["datetime", "rfc7231"], true]`);
    expect(operations).toContain(
      `["since", "since", "query", ["datetime", "unixTimestamp"], true]`,
    );
    expect(operations).toContain(`since: number`);
    expect(operations).toContain(`["modified", "modified", ["datetime", "rfc7231"]]`);
    expect(operations).toContain(`["day", "day", ["datetime", "date"]]`);
    expect(operations).toContain(`["clock", "clock", ["datetime", "time"]]`);
    expect(operations).toContain(`["expires", "expires", ["datetime", "rfc3339"]]`);
    expect(operations).toContain(`expires: string`);
    expect(operations).toContain(`["timestamp", "timestamp", ["datetime", "rfc3339-fixed-width"]]`);
  });

  it("reports unsupported scalar wire types", async () => {
    const [, diagnostics] = await EmitterTester.compileAndDiagnose({
      "main.tsp": `
        import "@typespec/http";
        using Http;

        @service
        namespace UnsupportedScalarDemo;

        scalar unsupported;

        @route("/items")
        @get
        op get(@query value: unsupported): {
          @statusCode statusCode: 204;
        };
      `,
    });

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "@azure-tools/typespec-azurite-emitter/unsupported-type",
    );
    expect(diagnostics[0]?.message).toContain("unsupported scalar unsupported");
  });

  it("reports unrepresentable numeric literals instead of substituting zero", async () => {
    const [, diagnostics] = await EmitterTester.compileAndDiagnose({
      "main.tsp": `
        import "@typespec/http";
        using Http;

        @service
        namespace NumericLiteralDemo;

        @route("/items")
        @get
        op get(): {
          @statusCode statusCode: 200;
          @header("x-huge") value: 1e10000;
        };
      `,
    });

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "@azure-tools/typespec-azurite-emitter/unsupported-type",
    );
    expect(diagnostics[0]?.message).toContain("cannot be represented as a JavaScript number");
  });

  it("reports multiple services", async () => {
    const [, diagnostics] = await EmitterTester.compileAndDiagnose({
      "main.tsp": `
        import "@typespec/http";
        using Http;

        @service namespace First {
          @route("/first") @get op get(): { @statusCode statusCode: 204; };
        }

        @service namespace Second {
          @route("/second") @get op get(): { @statusCode statusCode: 204; };
        }
      `,
    });

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "@azure-tools/typespec-azurite-emitter/multiple-services",
    );
  });

  it("uses qualified handler names when distinct runtime names normalize to one TS name", async () => {
    const { outputs } = await EmitterTester.compile({
      "main.tsp": `
        import "@typespec/http";
        import "@azure-tools/typespec-client-generator-core";
        using Http;
        using Azure.ClientGenerator.Core;
        @service namespace Names;
        @route("/a") interface A { @clientName("get_url") @get read(): void; }
        @route("/b") interface B { @clientName("getUrl") @get read(): void; }
      `,
    });
    const handlers = findOutput(outputs, "handlers.ts");
    expect(handlers).toMatch(/aGetUrl\(\s*params: AGetUrlParameters/);
    expect(handlers).toMatch(/bGetUrl\(\s*params: BGetUrlParameters/);
    expect(findOutput(outputs, "metadata.ts")).not.toContain('from "./models"');
  });

  it("prevents output when operation names collide without deterministic qualification", async () => {
    const [{ outputs }, diagnostics] = await EmitterTester.compileAndDiagnose({
      "main.tsp": `
        import "@typespec/http";
        using Http;

        @service
        namespace OperationCollisionDemo {
          @route("/a") @get op get_url(): string;
          @route("/b") @get op getUrl(): string;
        }
      `,
    });

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "@azure-tools/typespec-azurite-emitter/operation-name-collision",
    );
    expect(outputs).toEqual({});
  });

  it("reports HTTP diagnostics before rendering", async () => {
    const [{ outputs }, diagnostics] = await EmitterTester.compileAndDiagnose({
      "main.tsp": `
        import "@typespec/http";
        using Http;

        @service
        namespace HttpDiagnosticDemo {
          @route("/same") @get op first(): { @statusCode statusCode: 204; };
          @route("/same") @get op second(): { @statusCode statusCode: 204; };
        }
      `,
    });

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "@typespec/http/duplicate-operation",
      "@typespec/http/duplicate-operation",
    ]);
    expect(outputs).toEqual({});
  });

  it.each([
    ["@service namespace Empty {}", "no-operations", "no operations"],
    [
      `namespace A { model Item { id: string; } }
       namespace B { model Item { count: int32; } }
       @service namespace Demo { @post op replace(@body item: A.Item): B.Item; }`,
      "unsupported-type",
      "distinct models share the generated name 'Item'",
    ],
    [
      `@service namespace Demo { @post op send(@query body: string, @body payload: string): void; }`,
      "unsupported-type",
      "parameter 'body' conflicts with the request body",
    ],
  ])(
    "rejects an unrepresentable service without writing output: %s",
    async (spec, code, message) => {
      const [{ outputs }, diagnostics] = await EmitterTester.compileAndDiagnose(
        `import "@typespec/http"; using Http; ${spec}`,
      );
      expect(diagnostics).toMatchObject([
        {
          code: `@azure-tools/typespec-azurite-emitter/${code}`,
          message: expect.stringContaining(message),
        },
      ]);
      expect(outputs).toEqual({});
    },
  );

  it("uses the implicit and explicit string values of enum members", async () => {
    const [{ outputs }, diagnostics] = await EmitterTester.compileAndDiagnose({
      "main.tsp": `
        import "@typespec/http";
        using Http;

        enum Mode {
          fast,
          slow: "slow-mode",
        }

        @service
        namespace EnumDemo {
          @route("/items") @get op get(@query mode: Mode): {
            @statusCode statusCode: 204;
          };
        }
      `,
    });

    expect(diagnostics).toEqual([]);
    const operations = findOutput(outputs, "operations.ts");
    expect(operations).toContain(`mode: "fast" | "slow-mode"`);
    expect(operations).toContain(`["union", [["literal", "fast"], ["literal", "slow-mode"]]]`);
  });

  it("diagnoses a numeric enum member rather than silently accepting strings", async () => {
    const [, diagnostics] = await EmitterTester.compileAndDiagnose({
      "main.tsp": `
        import "@typespec/http";
        using Http;
        @service namespace NumericEnums;
        enum Mode { fast, slow: 2 }
        @get op read(@query mode: Mode): void;
      `,
    });
    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        code: "@azure-tools/typespec-azurite-emitter/unsupported-type",
        message: expect.stringContaining("unsupported numeric enum member Mode.slow"),
        target: expect.objectContaining({ kind: "EnumMember", name: "slow" }),
      }),
    );
  });
});

function findOutput(outputs: Record<string, string>, suffix: string): string {
  const key = Object.keys(outputs).find((k) => k.endsWith(suffix));
  if (!key) {
    throw new Error(
      `No output file ending with ${suffix} found in ${Object.keys(outputs).join(", ")}`,
    );
  }
  return outputs[key];
}
