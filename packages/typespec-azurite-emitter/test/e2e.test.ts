import { describe, expect, it } from "vitest";
import { EmitterTester, loadQueuePilotFixture } from "./tester.js";

describe("end-to-end emit", () => {
  it("compiles the queue-pilot fixture (base + azurite overlay) without diagnostics and emits all artifacts", async () => {
    const [{ outputs }, diagnostics] =
      await EmitterTester.compileAndDiagnose(loadQueuePilotFixture());

    expect(diagnostics).toEqual([]);

    const fileNames = Object.keys(outputs)
      .map((path) => path.split("/").pop())
      .sort();
    expect(fileNames).toEqual(["handlers.ts", "models.ts", "operations.ts", "serialization.ts"]);
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

  it("generates operations.ts with route metadata for all fixture operations", async () => {
    const { outputs } = await EmitterTester.compile(loadQueuePilotFixture());
    const operationsFile = findOutput(outputs, "operations.ts");

    expect(operationsFile).toContain(`name: "Queue_Create"`);
    expect(operationsFile).toContain(`verb: "put"`);
    expect(operationsFile).toContain(`name: "ListMessages"`);
    expect(operationsFile).toContain(`verb: "get"`);
    expect(operationsFile).toContain(`name: "SetAccessPolicy"`);
    expect(operationsFile).toContain(`location: "query"`);
    expect(operationsFile).toContain(`location: "path"`);
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
      /queue_Create\(\s*params: Queue_CreateParameters,\s*context: Context,\s*\): Promise<Queue_CreateResponse>;/,
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

  it("generates serialization.ts with direct Azurite serialization helpers", async () => {
    const { outputs } = await EmitterTester.compile(loadQueuePilotFixture());
    const serializationFile = findOutput(outputs, "serialization.ts");

    expect(serializationFile).not.toContain(`@azure/ms-rest-js`);
    expect(serializationFile).toContain(`export async function deserializeRequest`);
    expect(serializationFile).toContain(`export function serializeResponse`);
    expect(serializationFile).not.toContain(
      `function deserializeDeleteQueueRequest(req: IRequest)`,
    );
    expect(serializationFile).not.toContain(`function serializeDeleteQueueResponse`);
    expect(serializationFile).toContain(`function deserializeMetadataRequest`);
    expect(serializationFile).toContain(`function serializeMetadataResponse`);
    expect(serializationFile).toContain(
      `setHeader(res, header.wireName, serializeValue(header.type, handlerResponse.headers?.[header.name]))`,
    );
    expect(serializationFile).toContain(`import type Context from "../../generated/Context";`);
    expect(serializationFile).toContain(`import type { IHandlerParameters }`);
    expect(serializationFile).toMatch(
      /export async function deserializeRequest\(\s*name: string,\s*req: IRequest,\s*context: Context,/,
    );
    expect(serializationFile).toContain(
      `deserializeMetadataRequest(getGeneratedOperation(name), req, context)`,
    );
    expect(serializationFile).toContain(`function deserializePathParameter`);
    expect(serializationFile).toContain(`getContextPathParameter(context, parameter)`);
    expect(serializationFile).not.toContain(`if (parameter.location === "path") continue`);
    expect(serializationFile).toContain(`return parameter.name;`);
    expect(serializationFile).not.toContain(
      `return ["options", getHandlerParameterName(parameter)]`,
    );
    expect(serializationFile).not.toContain(`handlerResponse[header.name]`);
    expect(serializationFile).not.toContain(`handlerResponse.body ??`);
    expect(serializationFile).not.toContain(`setParameterValue(parameters, "body", req.getBody())`);
    expect(serializationFile).not.toContain(`function coerceRequestBodyValue`);
    expect(serializationFile).not.toContain(`function coerceResponseBodyValue`);
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
