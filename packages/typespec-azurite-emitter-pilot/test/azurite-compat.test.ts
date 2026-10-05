import { describe, expect, it } from "vitest";
import { EmitterTester, loadQueuePilotFixture } from "./tester.js";

/**
 * Structural fit-check against the real Azure/Azurite repo (not just internal consistency).
 *
 * These assertions were written by comparing our generated artifacts against Azurite's current
 * (AutoRest-generated) equivalents on its `main` branch, fetched directly from GitHub while
 * writing this test (not from memory):
 *
 *  - Handler method shape:
 *    `src/queue/generated/handlers/IQueueHandler.ts` - every method has the shape
 *    `methodName(options: Models.XxxOptionalParams, context: Context): Promise<Models.XxxResponse>`,
 *    e.g.:
 *      `create(options: Models.QueueCreateOptionalParams, context: Context): Promise<Models.QueueCreateResponse>;`
 *    i.e. a typed parameters object **and** a trailing per-request `context` argument - not just
 *    the parameters. `src/queue/generated/Context.ts` defines that `Context` class (it carries
 *    the matched `operation`, the raw `request`/`response`, and dispatch bookkeeping).
 *
 *  - Dispatcher inputs:
 *    `src/queue/generated/middleware/dispatch.middleware.ts`'s `isRequestAgainstOperation` picks
 *    the matching operation for an incoming request using exactly: the HTTP method
 *    (`spec.httpMethod`), the URL path template (`spec.path`, matched via `isURITemplateMatch`),
 *    and - critically - only the **required** query/header parameters
 *    (`spec.queryParameters`/`spec.headerParameters`, filtered by `mapper.required`) to
 *    disambiguate between operations that otherwise share a path/verb (its own comment: "a
 *    SetContainerMetadata request will fit both CreateContainer and SetContainerMetadata
 *    specifications"). `src/queue/generated/artifacts/parameters.ts` shows those parameter
 *    mappers carry `serializedName` (our `wireName`) and `required`.
 *    `src/queue/generated/artifacts/specifications.ts` shows responses keyed by status code with
 *    a `headersMapper` per status (e.g. `queueCreateOperationSpec.responses` has both `201` and
 *    `204`, each with `headersMapper: Mappers.QueueCreateHeaders`).
 *
 * This test suite does not attempt to reproduce Azurite's XML serialization, OData/batch
 * handling, or its exact msRest-based `OperationSpec` encoding - those are explicitly out of
 * scope for this pilot (see README). It only asserts that our generated artifacts carry the same
 * *categories* of information (method+trailing-context handler shape; path/verb/required-param
 * dispatch metadata; per-status-code response/header metadata) that Azurite's real
 * dispatcher/handler boundary relies on, so a real integration would not need to invent new
 * concepts - just a different encoding of the same facts.
 */
describe("structural fit against Azure/Azurite's real generated artifacts", () => {
  it("handler methods take a typed parameters object AND a trailing context argument, like IQueueHandler.ts", async () => {
    const { outputs } = await EmitterTester.compile(loadQueuePilotFixture());
    const handlersFile = findOutput(outputs, "handlers.ts");

    // Mirrors e.g.:
    //   create(options: Models.QueueCreateOptionalParams, context: Context): Promise<Models.QueueCreateResponse>;
    // from https://github.com/Azure/Azurite/blob/main/src/queue/generated/handlers/IQueueHandler.ts
    expect(handlersFile).toMatch(
      /createQueue\(params: CreateQueueParameters, context: Context\): Promise<CreateQueueResponse>;/,
    );
    // Every operation follows the same (params, context) => Promise<Response> shape.
    const methodSignatures = [
      ...handlersFile.matchAll(/^\s*\w+\(params: \w+, context: Context\): Promise<\w+>;/gm),
    ];
    expect(methodSignatures).toHaveLength(3);
  });

  it("declares a trailing Context type, mirroring Azurite's generated per-request Context object", async () => {
    const { outputs } = await EmitterTester.compile(loadQueuePilotFixture());
    const handlersFile = findOutput(outputs, "handlers.ts");

    expect(handlersFile).toContain("export interface Context {");
  });

  it("route metadata carries the HTTP method + path template a dispatcher needs to match a request, like dispatch.middleware.ts's spec.httpMethod/spec.path", async () => {
    const { outputs } = await EmitterTester.compile(loadQueuePilotFixture());
    const operationsFile = findOutput(outputs, "operations.ts");

    expect(operationsFile).toContain(`name: "CreateQueue"`);
    expect(operationsFile).toContain(`verb: "put"`);
    expect(operationsFile).toContain(`path: "/{queueName}"`);

    expect(operationsFile).toContain(`name: "ListMessages"`);
    expect(operationsFile).toContain(`verb: "get"`);
    expect(operationsFile).toContain(`path: "/{queueName}/messages"`);
  });

  it("route metadata marks each parameter's wire name, location, and whether it is required - the exact fields dispatch.middleware.ts's isRequestAgainstOperation reads off spec.queryParameters/headerParameters", async () => {
    const { outputs } = await EmitterTester.compile(loadQueuePilotFixture());
    const operationsFile = findOutput(outputs, "operations.ts");

    // ListMessages's query parameters are optional in our fixture (unlike Azurite's required
    // `comp=list`-style discriminator parameters) - required:false is still the correct,
    // consumable signal for a dispatcher deciding whether a param is mandatory for matching.
    expect(operationsFile).toContain(
      `{ name: "numOfMessages", wireName: "numOfMessages", location: "query", required: false }`,
    );
    expect(operationsFile).toContain(
      `{ name: "visibilityTimeout", wireName: "visibilityTimeout", location: "query", required: false }`,
    );
    // CreateQueue's path parameter is required, like Azurite's `Parameters.url` binding.
    expect(operationsFile).toContain(
      `{ name: "queueName", wireName: "queueName", location: "path", required: true }`,
    );
  });

  it("response metadata is keyed by status code with header wire names, like specifications.ts's per-status headersMapper (e.g. QueueCreateOperationSpec's 201 response)", async () => {
    const { outputs } = await EmitterTester.compile(loadQueuePilotFixture());
    const operationsFile = findOutput(outputs, "operations.ts");

    // CreateQueue: 201 response carrying the custom x-ms-request-id header, analogous to
    // queueCreateOperationSpec.responses[201].headersMapper in Azurite's specifications.ts.
    expect(operationsFile).toContain(
      `{ statusCode: 201, headers: [{ name: "requestId", wireName: "x-ms-request-id" }] }`,
    );
    // GetQueueProperties: 200 response carrying the custom approximate-messages-count header.
    expect(operationsFile).toContain(
      `{ statusCode: 200, headers: [{ name: "approximateMessagesCount", wireName: "x-ms-approximate-messages-count" }] }`,
    );
  });

  it("request body content type is captured per operation, like specifications.ts's contentType field", async () => {
    const { outputs } = await EmitterTester.compile(loadQueuePilotFixture());
    const operationsFile = findOutput(outputs, "operations.ts");

    expect(operationsFile).toContain(`requestBodyContentTypes: ["application/json"]`);
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
