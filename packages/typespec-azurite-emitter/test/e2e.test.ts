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
      /AccessPolicyXmlMetadata[\s\S]*\["start", "start", "datetime"\][\s\S]*\["expiry", "expiry", "datetime"\][\s\S]*\["permission", "permission", "string"\]/,
    );
    expect(modelsFile).not.toMatch(
      /AccessPolicyXmlMetadata[\s\S]*\["start", "start", "datetime", undefined, undefined, true\]/,
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
      /queue_Create\(\s*params: QueueCreateParameters,\s*context: Context,\s*\): Promise<QueueCreateResponse>;/,
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
  it("documents compact union descriptor policy", async () => {
    const [{ outputs }, diagnostics] = await EmitterTester.compileAndDiagnose({
      "main.tsp": `
        import "@typespec/http";
        using Http;

        @service
        namespace UnsupportedUnionDemo;

        @route("/items")
        @get
        op get(@query value: string | int32): {
          @statusCode statusCode: 204;
        };
      `,
    });

    expect(diagnostics).toEqual([]);
    expect(findOutput(outputs, "operations.ts")).toContain(
      `["value", "value", "query", ["union", ["string", "number"]], true]`,
    );
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
      "@azure-tools/typespec-azurite-emitter/skipped-operation",
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
      "@azure-tools/typespec-azurite-emitter/skipped-operation",
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

    expect(diagnostics.some((diagnostic) => diagnostic.code.includes("duplicate"))).toBe(true);
    expect(outputs).toEqual({});
  });

  it("documents enum-as-string wire policy", async () => {
    const [{ outputs }, diagnostics] = await EmitterTester.compileAndDiagnose({
      "main.tsp": `
        import "@typespec/http";
        using Http;

        enum Mode {
          fast,
          slow,
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
    expect(findOutput(outputs, "operations.ts")).toContain(
      `["mode", "mode", "query", "string", true]`,
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
