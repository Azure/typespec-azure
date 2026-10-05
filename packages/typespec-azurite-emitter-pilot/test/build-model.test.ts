import { describe, expect, it } from "vitest";
import { buildServerModel, toPascalCase } from "../src/build-model.js";
import { ApiTester, loadQueuePilotFixture } from "./tester.js";

describe("toPascalCase", () => {
  it("upper-cases the first letter", () => {
    expect(toPascalCase("listMessages")).toBe("ListMessages");
  });

  it("handles empty strings", () => {
    expect(toPascalCase("")).toBe("");
  });
});

describe("buildServerModel", () => {
  it("builds one operation per HTTP operation with the right verb and path", async () => {
    const { program } = await ApiTester.compile(loadQueuePilotFixture());
    const serverModel = buildServerModel(program);

    const names = serverModel.operations.map((op) => op.name).sort();
    expect(names).toEqual(["CreateQueue", "GetQueueProperties", "ListMessages"]);

    const createQueue = serverModel.operations.find((op) => op.name === "CreateQueue")!;
    expect(createQueue.verb).toBe("put");
    expect(createQueue.path).toBe("/{queueName}");

    const listMessages = serverModel.operations.find((op) => op.name === "ListMessages")!;
    expect(listMessages.verb).toBe("get");
    expect(listMessages.path).toBe("/{queueName}/messages");
  });

  it("captures path and query parameters with their wire names and optionality", async () => {
    const { program } = await ApiTester.compile(loadQueuePilotFixture());
    const serverModel = buildServerModel(program);

    const listMessages = serverModel.operations.find((op) => op.name === "ListMessages")!;
    const byName = Object.fromEntries(listMessages.parameters.map((p) => [p.name, p]));

    expect(byName.queueName).toMatchObject({ location: "path", optional: false });
    expect(byName.numOfMessages).toMatchObject({
      location: "query",
      wireName: "numOfMessages",
      optional: true,
    });
    expect(byName.visibilityTimeout).toMatchObject({ location: "query", optional: true });
  });

  it("captures the request body type and content types", async () => {
    const { program } = await ApiTester.compile(loadQueuePilotFixture());
    const serverModel = buildServerModel(program);

    const createQueue = serverModel.operations.find((op) => op.name === "CreateQueue")!;
    expect(createQueue.requestBody).toMatchObject({
      type: { kind: "model", name: "QueueMetadata" },
      contentTypes: ["application/json"],
    });
  });

  it("captures response status codes, headers and bodies", async () => {
    const { program } = await ApiTester.compile(loadQueuePilotFixture());
    const serverModel = buildServerModel(program);

    const createQueue = serverModel.operations.find((op) => op.name === "CreateQueue")!;
    expect(createQueue.responses).toHaveLength(1);
    expect(createQueue.responses[0].statusCode).toBe(201);
    expect(createQueue.responses[0].headers).toEqual([
      { name: "requestId", wireName: "x-ms-request-id", type: { kind: "string" }, optional: false },
    ]);

    const getQueueProperties = serverModel.operations.find(
      (op) => op.name === "GetQueueProperties",
    )!;
    const [response] = getQueueProperties.responses;
    expect(response.statusCode).toBe(200);
    expect(response.headers[0]).toMatchObject({
      wireName: "x-ms-approximate-messages-count",
      type: { kind: "number" },
    });
    expect(response.body).toMatchObject({ type: { kind: "model", name: "QueueProperties" } });
  });

  it("registers transitively referenced models with their properties", async () => {
    const { program } = await ApiTester.compile(loadQueuePilotFixture());
    const serverModel = buildServerModel(program);

    const modelNames = serverModel.models.map((m) => m.name).sort();
    expect(modelNames).toEqual([
      "QueueMessage",
      "QueueMessageList",
      "QueueMetadata",
      "QueueProperties",
    ]);

    const queueMetadata = serverModel.models.find((m) => m.name === "QueueMetadata")!;
    const props = Object.fromEntries(queueMetadata.properties.map((p) => [p.name, p]));
    expect(props.description).toMatchObject({ optional: true, type: { kind: "string" } });
    expect(props.publicAccess).toMatchObject({ optional: true, type: { kind: "boolean" } });
  });

  it("resolves array-of-model types for nested list bodies", async () => {
    const { program } = await ApiTester.compile(loadQueuePilotFixture());
    const serverModel = buildServerModel(program);

    const list = serverModel.models.find((m) => m.name === "QueueMessageList")!;
    expect(list.properties[0]).toMatchObject({
      name: "messages",
      type: { kind: "array", element: { kind: "model", name: "QueueMessage" } },
    });
  });

  it("applies overlay documentation added via augment decorators in azurite.tsp", async () => {
    const { program } = await ApiTester.compile(loadQueuePilotFixture());
    const serverModel = buildServerModel(program);

    const createQueue = serverModel.operations.find((op) => op.name === "CreateQueue")!;
    expect(createQueue.doc).toContain("Azurite note: queue creation is idempotent");

    const queueMetadata = serverModel.models.find((m) => m.name === "QueueMetadata")!;
    const publicAccess = queueMetadata.properties.find((p) => p.name === "publicAccess")!;
    expect(publicAccess.doc).toContain("Azurite note: public access is always treated");
  });
});
