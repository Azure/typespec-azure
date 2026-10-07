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

  it("renders TypeSpec-derived model members with reusable type components for required, optional, array, record, and referenced properties", async () => {
    const { outputs } = await EmitterTester.compile({
      "main.tsp": `
        import "@typespec/http";
        using Http;

        @service
        namespace ComponentRenderingDemo;

        model Child {
          value: string;
        }

        model Parent {
          requiredName: string;
          optionalTags?: string[];
          metadata?: Record<string>;
          child: Child;
        }

        @route("/parents")
        @get
        op getParent(): {
          @statusCode statusCode: 200;
          @body body: Parent;
        };
      `,
    });
    const modelsFile = findOutput(outputs, "models.ts");

    expect(modelsFile).toContain("requiredName: string;");
    expect(modelsFile).toContain("optionalTags?: Array<string>;");
    expect(modelsFile).toContain("metadata?: Record<string, string>;");
    expect(modelsFile).toContain("child: Child;");
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
    expect(metadataFile).toContain(
      `export const operations: readonly OperationMetadata[] = serviceMetadata.operations;`,
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
    expect(findOutput(outputs, "operations.ts")).not.toContain(`../custom/runtime.js`);
    expect(findOutput(outputs, "serialization.ts")).toContain(`from "../custom/runtime.js";`);
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
