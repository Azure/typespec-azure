import { describe, expect, it } from "vitest";
import type { ServerModel } from "../src/model.js";
import { renderHandlers } from "../src/render/render-handlers.js";
import { renderModels } from "../src/render/render-models.js";
import { renderOperations } from "../src/render/render-operations.js";
import { renderTypeRef } from "../src/render/type-ref.js";

const sampleServerModel: ServerModel = {
  serviceName: "QueuePilot",
  models: [
    {
      name: "QueueMetadata",
      doc: "Queue metadata.",
      properties: [
        { name: "description", type: { kind: "string" }, optional: true, doc: "A description." },
        { name: "publicAccess", type: { kind: "boolean" }, optional: true },
      ],
    },
    {
      name: "QueueMessage",
      properties: [
        { name: "messageId", type: { kind: "string" }, optional: false },
        {
          name: "tags",
          type: { kind: "array", element: { kind: "string" } },
          optional: true,
        },
      ],
    },
  ],
  operations: [
    {
      name: "CreateQueue",
      verb: "put",
      path: "/{queueName}",
      doc: "Creates a queue.",
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
  ],
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
    expect(output).toContain(`path: "/{queueName}"`);
    expect(output).toContain(`{ name: "queueName", wireName: "queueName", location: "path" }`);
    expect(output).toContain("hasRequestBody: true");
    expect(output).toContain(`requestBodyContentTypes: ["application/json"]`);
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

  it("declares one camelCase method per operation returning a Promise", () => {
    expect(output).toContain(
      "createQueue(params: CreateQueueParameters): Promise<CreateQueueResponse>;",
    );
  });
});
