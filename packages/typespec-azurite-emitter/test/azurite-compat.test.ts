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

    expect(operationsFile).toContain(`name: "Queue_Create"`);
    expect(operationsFile).toContain(`verb: "put"`);
    expect(operationsFile).toContain(`path: "/{queueName}"`);

    expect(operationsFile).toContain(`name: "ListMessages"`);
    expect(operationsFile).toContain(`verb: "get"`);
    expect(operationsFile).toContain(`path: "/{queueName}/messages"`);
  });

  it("route metadata marks each parameter's wire name, location, and whether it is required - the exact fields dispatch.middleware.ts's isRequestAgainstOperation reads off spec.queryParameters/headerParameters", async () => {
    const { outputs } = await EmitterTester.compile(loadQueuePilotFixture());
    const operationsFile = findOutput(outputs, "operations.ts");

    expect(operationsFile).toMatch(
      /name: "numOfMessages",\s*wireName: "numOfMessages",\s*location: "query",\s*required: false,\s*type: \{\s*kind: "number"/,
    );
    expect(operationsFile).toMatch(
      /name: "visibilityTimeout",\s*wireName: "visibilityTimeout",\s*location: "query",\s*required: false,\s*type: \{\s*kind: "number"/,
    );
    expect(operationsFile).toMatch(
      /name: "queueName",\s*wireName: "queueName",\s*location: "path",\s*required: true,\s*type: \{\s*kind: "string"/,
    );
  });

  it("response metadata is keyed by status code with header wire names, like specifications.ts's per-status headersMapper (e.g. QueueCreateOperationSpec's 201 response)", async () => {
    const { outputs } = await EmitterTester.compile(loadQueuePilotFixture());
    const operationsFile = findOutput(outputs, "operations.ts");

    expect(operationsFile).toMatch(
      /statusCode: 201,\s*headers: \[\s*\{\s*name: "requestId",\s*wireName: "x-ms-request-id",\s*type: \{\s*kind: "string"/,
    );
    expect(operationsFile).toMatch(
      /statusCode: 200,\s*headers: \[\s*\{\s*name: "approximateMessagesCount",\s*wireName: "x-ms-approximate-messages-count",\s*type: \{\s*kind: "number"[\s\S]*body: \{\s*type: \{\s*kind: "model",\s*name: "QueueProperties"/,
    );
  });

  it("request body content type is captured per operation, like specifications.ts's contentType field", async () => {
    const { outputs } = await EmitterTester.compile(loadQueuePilotFixture());
    const operationsFile = findOutput(outputs, "operations.ts");

    expect(operationsFile).toMatch(/requestBodyContentTypes: \[\s*"application\/json"\s*\]/);
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
