import { describe, expect, it } from "vitest";
import type { ServerModel } from "../src/model.js";
import { renderHandlers } from "../src/render/render-handlers.js";
import { renderModels } from "../src/render/render-models.js";
import { renderOperations } from "../src/render/render-operations.js";
import { renderSerialization } from "../src/render/render-serialization.js";
import { renderTypeRef } from "../src/render/type-ref.js";

const sampleServerModel: ServerModel = {
  serviceName: "QueuePilot",
  models: [
    {
      name: "QueueMetadata",
      wireName: "QueueMetadata",
      doc: "Queue metadata.",
      properties: [
        {
          name: "description",
          wireName: "Description",
          type: { kind: "string" },
          optional: true,
          xmlAttribute: false,
          xmlUnwrapped: false,
          doc: "A description.",
        },
        {
          name: "publicAccess",
          wireName: "PublicAccess",
          type: { kind: "boolean" },
          optional: true,
          xmlAttribute: false,
          xmlUnwrapped: false,
        },
      ],
    },
    {
      name: "QueueMessage",
      wireName: "QueueMessage",
      properties: [
        {
          name: "messageId",
          wireName: "MessageId",
          type: { kind: "string" },
          optional: false,
          xmlAttribute: false,
          xmlUnwrapped: false,
        },
        {
          name: "tags",
          wireName: "Tags",
          type: { kind: "array", element: { kind: "string" } },
          optional: true,
          xmlAttribute: false,
          xmlUnwrapped: false,
        },
      ],
    },
  ],
  operations: [
    {
      name: "CreateQueue",
      verb: "put",
      rawPath: "/{queueName}",
      path: "/{queueName}",
      literalQueryParameters: [],
      doc: "Creates a queue.",
      interfaceName: "Queue",
      parameters: [
        {
          name: "queueName",
          wireName: "queueName",
          location: "path",
          type: { kind: "string" },
          optional: false,
        },
      ],
      requestBody: {
        type: { kind: "model", name: "QueueMetadata" },
        contentTypes: ["application/json"],
        parameterPath: "body",
      },
      responses: [
        {
          statusCode: 201,
          headers: [
            {
              name: "requestId",
              wireName: "x-ms-request-id",
              type: { kind: "string" },
              optional: false,
            },
          ],
        },
      ],
    },
    {
      name: "DeleteQueue",
      verb: "delete",
      rawPath: "/{queueName}",
      path: "/{queueName}",
      literalQueryParameters: [],
      interfaceName: "Queue",
      parameters: [
        {
          name: "queueName",
          wireName: "queueName",
          location: "path",
          type: { kind: "string" },
          optional: false,
        },
      ],
      responses: [
        {
          statusCode: 204,
          headers: [
            {
              name: "requestId",
              wireName: "x-ms-request-id",
              type: { kind: "string" },
              optional: false,
            },
          ],
        },
      ],
    },
  ],
  skippedOperations: [],
};

describe("renderTypeRef", () => {
  it("renders primitives", () => {
    expect(renderTypeRef({ kind: "string" })).toBe("string");
    expect(renderTypeRef({ kind: "number" })).toBe("number");
    expect(renderTypeRef({ kind: "boolean" })).toBe("boolean");
    expect(renderTypeRef({ kind: "unknown" })).toBe("unknown");
  });

  it("renders model references by name", () => {
    expect(renderTypeRef({ kind: "model", name: "QueueMetadata" })).toBe("QueueMetadata");
  });

  it("renders arrays", () => {
    expect(renderTypeRef({ kind: "array", element: { kind: "string" } })).toBe("string[]");
    expect(renderTypeRef({ kind: "array", element: { kind: "model", name: "QueueMessage" } })).toBe(
      "QueueMessage[]",
    );
  });

  it("renders literals", () => {
    expect(renderTypeRef({ kind: "literal", value: "foo" })).toBe(`"foo"`);
    expect(renderTypeRef({ kind: "literal", value: 42 })).toBe("42");
    expect(renderTypeRef({ kind: "literal", value: true })).toBe("true");
  });
});

describe("renderModels", () => {
  const output = renderModels(sampleServerModel);

  it("declares an exported interface per model", () => {
    expect(output).toContain("export interface QueueMetadata {");
    expect(output).toContain("export interface QueueMessage {");
  });

  it("marks optional properties with `?` and renders doc comments", () => {
    expect(output).toContain("/** A description. */");
    expect(output).toContain("description?: string;");
    expect(output).toContain("publicAccess?: boolean;");
  });

  it("requires non-optional properties and renders array types", () => {
    expect(output).toContain("messageId: string;");
    expect(output).toContain("tags?: string[];");
  });
});

describe("renderOperations", () => {
  const output = renderOperations(sampleServerModel);

  it("imports model types referenced in bodies/headers from models.ts", () => {
    expect(output).toContain(`import type { QueueMetadata } from "./models.js";`);
  });

  it("renders a parameters interface per operation including body", () => {
    expect(output).toContain("export interface CreateQueueParameters {");
    expect(output).toContain("queueName: string;");
    expect(output).toContain("body: QueueMetadata;");
  });

  it("renders a discriminated response union including headers", () => {
    expect(output).toContain("export type CreateQueueResponse =");
    expect(output).toContain("statusCode: 201;");
    expect(output).toContain("requestId: string;");
  });

  it("renders runtime route metadata with parameter bindings", () => {
    expect(output).toContain("export const operations: readonly OperationMetadata[] = [");
    expect(output).toContain(`name: "CreateQueue"`);
    expect(output).toContain(`verb: "put"`);
    expect(output).toContain(`rawPath: "/{queueName}"`);
    expect(output).toContain(`path: "/{queueName}"`);
    expect(output).toContain(`literalQueryParameters: []`);
    expect(output).toContain(`requiredQueryParameters: []`);
    expect(output).toContain(`requiredHeaderParameters: []`);
    expect(output).toContain(
      `{ name: "queueName", wireName: "queueName", location: "path", required: true, type: { kind: "string" } }`,
    );
    expect(output).toContain("hasRequestBody: true");
    expect(output).toContain(`requestBodyContentTypes: ["application/json"]`);
    expect(output).toContain(
      `{ statusCode: 201, headers: [{ name: "requestId", wireName: "x-ms-request-id", type: { kind: "string" } }] }`,
    );
    expect(output).toContain(`interfaceName: "Queue"`);
  });
});

describe("renderHandlers", () => {
  const output = renderHandlers(sampleServerModel);

  it("imports the generated parameter/response types", () => {
    expect(output).toContain(`import type {`);
    expect(output).toContain("CreateQueueParameters,");
    expect(output).toContain("CreateQueueResponse,");
    expect(output).toContain(`} from "./operations.js";`);
  });

  it("declares a placeholder Context type mirroring Azurite's generated Context object", () => {
    expect(output).toContain("export interface Context {");
  });

  it("declares one camelCase method per operation taking params + context and returning a Promise", () => {
    expect(output).toContain(
      "createQueue(params: CreateQueueParameters, context: Context): Promise<CreateQueueResponse>;",
    );
  });
});

describe("renderSerialization", () => {
  const output = renderSerialization(sampleServerModel);

  it("renders direct request/response serialization helpers with shared metadata helpers", () => {
    expect(output).not.toContain(`@azure/ms-rest-js`);
    expect(output).toContain(`export async function deserializeRequest`);
    expect(output).toContain(`export function serializeResponse`);
    expect(output).not.toContain(`function deserializeDeleteQueueRequest(req: IRequest)`);
    expect(output).not.toContain(`function serializeDeleteQueueResponse`);
    expect(output).toContain(`function deserializeMetadataRequest`);
    expect(output).toContain(`function serializeMetadataResponse`);
    expect(output).toContain(`setHeader(res, header.wireName`);
  });

  it("uses switch-based entrypoints instead of a generated operation map", () => {
    expect(output).not.toContain(`serializationOperations`);
    expect(output).toContain(`case "DeleteQueue":`);
    expect(output).toContain(
      `return deserializeMetadataRequest(getGeneratedOperation(name), req);`,
    );
    expect(output).toContain(`export function hasGeneratedSerialization(name: string): boolean {`);
  });
});
