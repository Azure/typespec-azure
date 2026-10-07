import { describe, expect, it } from "vitest";
import { EmitterTester, loadQueuePilotFixture } from "./tester.js";

describe("structural fit against Azure/Azurite's real generated artifacts", () => {
  it("handler methods take a typed parameters object AND a trailing context argument, like IQueueHandler.ts", async () => {
    const { outputs } = await EmitterTester.compile(loadQueuePilotFixture());
    const handlersFile = findOutput(outputs, "handlers.ts");

    // Mirrors e.g.:
    //   create(options: Models.QueueCreateOptionalParams, context: Context): Promise<Models.QueueCreateResponse>;
    // from https://github.com/Azure/Azurite/blob/main/src/queue/generated/handlers/IQueueHandler.ts
    expect(handlersFile).toMatch(
      /queue_Create\(\s*params: QueueCreateParameters,\s*context: Context,\s*\): Promise<QueueCreateResponse>;/,
    );
    // Every operation follows the same (params, context) => Promise<Response> shape.
    const methodSignatures = [
      ...handlersFile.matchAll(
        /^\s*\w+\(\s*params: \w+,\s*context: Context,\s*\): Promise<\w+>;/gm,
      ),
    ];
    expect(methodSignatures).toHaveLength(5);
  });

  it("declares a trailing Context type, mirroring Azurite's generated per-request Context object", async () => {
    const { outputs } = await EmitterTester.compile(loadQueuePilotFixture());
    const handlersFile = findOutput(outputs, "handlers.ts");

    expect(handlersFile).toContain("export interface Context {");
  });

  it("route metadata carries the HTTP method + path template a dispatcher needs to match a request, like dispatch.middleware.ts's spec.httpMethod/spec.path", async () => {
    const { outputs } = await EmitterTester.compile(loadQueuePilotFixture());
    const operationsFile = findOutput(outputs, "operations.ts");

    expect(operationsFile).toContain(`"Queue_Create"`);
    expect(operationsFile).toContain(`"put"`);
    expect(operationsFile).toContain(`"/{queueName}"`);

    expect(operationsFile).toContain(`"ListMessages"`);
    expect(operationsFile).toContain(`"get"`);
    expect(operationsFile).toContain(`"/{queueName}/messages"`);
  });

  it("route metadata marks each parameter's wire name, location, and whether it is required - the exact fields dispatch.middleware.ts's isRequestAgainstOperation reads off spec.queryParameters/headerParameters", async () => {
    const { outputs } = await EmitterTester.compile(loadQueuePilotFixture());
    const operationsFile = findOutput(outputs, "operations.ts");

    expect(operationsFile).toMatch(/\["numOfMessages", "numOfMessages", "query", "number"\]/);
    expect(operationsFile).toMatch(
      /\["visibilityTimeout", "visibilityTimeout", "query", "number"\]/,
    );
    expect(operationsFile).toMatch(/\["queueName", "queueName", "path", "string", true\]/);
  });

  it("response metadata is keyed by status code with header wire names, like specifications.ts's per-status headersMapper (e.g. QueueCreateOperationSpec's 201 response)", async () => {
    const { outputs } = await EmitterTester.compile(loadQueuePilotFixture());
    const operationsFile = findOutput(outputs, "operations.ts");

    expect(operationsFile).toMatch(/\[201, \[\["requestId", "x-ms-request-id", "string"\]\]\]/);
    expect(operationsFile).toMatch(
      /\[\s*200,[\s\S]*"approximateMessagesCount",[\s\S]*"x-ms-approximate-messages-count",[\s\S]*"number"[\s\S]*\["model", "QueueProperties"\]/,
    );
  });

  it("request body content type is captured per operation, like specifications.ts's contentType field", async () => {
    const { outputs } = await EmitterTester.compile(loadQueuePilotFixture());
    const operationsFile = findOutput(outputs, "operations.ts");

    expect(operationsFile).toContain(`[["model", "QueueMetadata"], ["application/json"]]`);
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
