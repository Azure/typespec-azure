import { $ } from "@typespec/compiler/typekit";
import { getAllHttpServices } from "@typespec/http";
import { describe, expect, it } from "vitest";
import { buildServerModel } from "../src/build-model.js";
import { getPascalName } from "../src/utils.js";
import { ApiTester, loadQueuePilotFixture } from "./tester.js";

describe("getPascalName", () => {
  it("upper-cases the first letter", () => {
    expect(getPascalName("listMessages")).toBe("ListMessages");
  });

  it("handles empty strings", () => {
    expect(getPascalName("")).toBe("");
  });
});

describe("buildServerModel", () => {
  it("builds one operation per HTTP operation with the right verb and path", async () => {
    const { program } = await ApiTester.compile(loadQueuePilotFixture());
    const serverModel = buildServerModel(program);

    const names = serverModel.operations.map((op) => op.name).sort();
    expect(names).toEqual([
      "DeleteQueue",
      "GetQueueProperties",
      "ListMessages",
      "Queue_Create",
      "SetAccessPolicy",
    ]);

    const createQueue = serverModel.operations.find((op) => op.name === "Queue_Create")!;
    expect(createQueue.verb).toBe("put");
    expect(createQueue.path).toBe("/{queueName}");
    expect(createQueue.rawPath).toBe("/{queueName}");

    const listMessages = serverModel.operations.find((op) => op.name === "ListMessages")!;
    expect(listMessages.verb).toBe("get");
    expect(listMessages.path).toBe("/{queueName}/messages");

    const setAccessPolicy = serverModel.operations.find((op) => op.name === "SetAccessPolicy")!;
    expect(setAccessPolicy.rawPath).toBe("/{queueName}?comp=acl");
    expect(setAccessPolicy.path).toBe("/{queueName}");
    expect(setAccessPolicy.literalQueryParameters).toEqual([{ name: "comp", value: "acl" }]);
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

    const createQueue = serverModel.operations.find((op) => op.name === "Queue_Create")!;
    expect(createQueue.requestBody).toMatchObject({
      type: { kind: "model", name: "QueueMetadata" },
      contentTypes: ["application/json"],
    });
  });

  it("captures response status codes, headers and bodies", async () => {
    const { program } = await ApiTester.compile(loadQueuePilotFixture());
    const serverModel = buildServerModel(program);

    const createQueue = serverModel.operations.find((op) => op.name === "Queue_Create")!;
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
      "AccessPolicy",
      "QueueMessage",
      "QueueMessageList",
      "QueueMetadata",
      "QueueProperties",
      "SignedIdentifier",
      "SignedIdentifiers",
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

  it("applies azurite.tsp overlay changes for Queue swagger customizations", async () => {
    const { program } = await ApiTester.compile(loadQueuePilotFixture());
    const serverModel = buildServerModel(program);

    const accessPolicy = serverModel.models.find((m) => m.name === "AccessPolicy")!;
    const accessPolicyProps = Object.fromEntries(accessPolicy.properties.map((p) => [p.name, p]));
    expect(accessPolicyProps.start).toMatchObject({ optional: true });
    expect(accessPolicyProps.expiry).toMatchObject({ optional: true });
    expect(accessPolicyProps.permission).toMatchObject({ optional: true });

    const [services] = getAllHttpServices(program);
    const listMessages = services[0].operations.find((op) => op.operation.name === "listMessages")!;
    const visibilityTimeout = listMessages.parameters.parameters.find(
      (p) => p.param.name === "visibilityTimeout",
    )!;
    expect($(program).type.maxValue(visibilityTimeout.param)).toBe(2147483647);
  });

  it("uses TCGC @clientName operation overrides when present", async () => {
    const { program } = await ApiTester.compile(loadQueuePilotFixture());
    const serverModel = buildServerModel(program);

    expect(serverModel.operations.some((op) => op.name === "Queue_Create")).toBe(true);
    expect(serverModel.operations.some((op) => op.name === "CreateQueue")).toBe(false);
  });

  it("uses TCGC @clientName overrides for named model, property, parameter, and header shapes", async () => {
    const { program } = await ApiTester.compile({
      "main.tsp": `
        import "@typespec/http";
        import "@azure-tools/typespec-client-generator-core";
        using Http;
        using Azure.ClientGenerator.Core;

        @service
        namespace NamingDemo;

        @clientName("GeneratedItem")
        model Item {
          @clientName("clientValue")
          value: string;
        }

        @route("/items/{itemId}")
        @get
        op getItem(
          @clientName("clientItemId")
          @path
          itemId: string,
        ): {
          @statusCode statusCode: 200;

          @clientName("clientRequestId")
          @header("x-ms-request-id")
          requestId: string;

          @body body: Item;
        };
      `,
    });
    const serverModel = buildServerModel(program);

    const item = serverModel.models.find((m) => m.name === "GeneratedItem")!;
    expect(item).toBeDefined();
    expect(item.properties[0].name).toBe("clientValue");

    const getItem = serverModel.operations.find((op) => op.name === "GetItem")!;
    expect(getItem.parameters[0].name).toBe("clientItemId");
    expect(getItem.responses[0].headers[0].name).toBe("clientRequestId");
    expect(getItem.responses[0].body?.type).toEqual({ kind: "model", name: "GeneratedItem" });
  });

  it("expands a Record<string> dictionary property to a record type ref instead of an empty named model", async () => {
    const { program } = await ApiTester.compile({
      "main.tsp": `
        import "@typespec/http";
        using Http;

        @service
        namespace RecordDemo;

        model Item {
          tags: Record<string>;
        }

        @route("/items")
        @get
        op getItem(): Item;
      `,
    });
    const serverModel = buildServerModel(program);

    const item = serverModel.models.find((m) => m.name === "Item")!;
    const tags = item.properties.find((p) => p.name === "tags")!;
    expect(tags.type).toMatchObject({ kind: "record", element: { kind: "string" } });
  });

  it("gives distinct anonymous models distinct names instead of collapsing them by shared empty name", async () => {
    // Two operations whose inline error-response bodies have genuinely different shapes. Keying
    // the anonymous-model cache by name (empty string for both) would incorrectly coalesce them
    // into one shared registry entry; keying by TypeSpec object identity keeps them distinct.
    const { program } = await ApiTester.compile({
      "main.tsp": `
        import "@typespec/http";
        using Http;

        @service
        namespace AnonymousDemo;

        @route("/a")
        @get
        op getA(): { @statusCode statusCode: 200; code: string };

        @route("/b")
        @get
        op getB(): { @statusCode statusCode: 200; message: string };
      `,
    });
    const serverModel = buildServerModel(program);

    const anonymousModels = serverModel.models.filter((m) => m.name.startsWith("AnonymousModel"));
    expect(anonymousModels.length).toBeGreaterThanOrEqual(2);
    expect(new Set(anonymousModels.map((m) => m.name)).size).toBe(anonymousModels.length);
  });

  it("does not register default error bodies as handler response models", async () => {
    const { program } = await ApiTester.compile({
      "main.tsp": `
        import "@typespec/http";
        using Http;

        @service
        namespace ErrorDemo;

        @error
        model StorageError {
          @header("x-ms-error-code")
          errorCode?: string;
          code?: string;
          message?: string;
        }

        @route("/items")
        @get
        op getItem(): {
          @statusCode statusCode: 200;
          @body body: string;
        } | StorageError;
      `,
    });
    const serverModel = buildServerModel(program);

    const getItem = serverModel.operations.find((op) => op.name === "GetItem")!;
    const defaultResponse = getItem.responses.find((response) => response.statusCode === "*")!;
    expect(defaultResponse.body).toBeUndefined();
    expect(serverModel.models.some((model) => model.name.startsWith("AnonymousModel"))).toBe(false);
  });

  it("reuses an already-registered named model for an equivalent anonymous model expression", async () => {
    const { program } = await ApiTester.compile({
      "main.tsp": `
        import "@typespec/http";
        using Http;

        @service
        namespace AnonymousReuseDemo;

        model Item {
          value: string;
        }

        @route("/items")
        @post
        op createItem(@body body: Item): {
          @statusCode statusCode: 200;
          @body body: {
            value: string;
          };
        };
      `,
    });
    const serverModel = buildServerModel(program);

    const createItem = serverModel.operations.find((op) => op.name === "CreateItem")!;
    expect(createItem.responses[0].body?.type).toEqual({ kind: "model", name: "Item" });
    expect(serverModel.models.map((model) => model.name)).toEqual(["Item"]);
  });

  it("disambiguates operation names that collide across different TypeSpec interfaces", async () => {
    // Two different interfaces each declaring a `getProperties` operation both PascalCase to
    // `GetProperties`, which would otherwise be a duplicate generated TS identifier.
    const { program } = await ApiTester.compile({
      "main.tsp": `
        import "@typespec/http";
        using Http;

        @service
        namespace CollisionDemo;

        @route("/a")
        interface A {
          @get getProperties(): string;
        }

        @route("/b")
        interface B {
          @get getProperties(): string;
        }
      `,
    });
    const serverModel = buildServerModel(program);

    const names = serverModel.operations.map((op) => op.name);
    expect(names).toHaveLength(2);
    expect(new Set(names).size).toBe(2);
    expect(names).toContain("GetProperties");
    expect(names.some((n) => n !== "GetProperties" && n.endsWith("GetProperties"))).toBe(true);

    // Each operation's generated metadata should also carry which interface declared it, so a
    // consumer (e.g. a dispatcher needing to classify operations by resource) doesn't have to
    // guess resource identity from the operation name/path alone.
    const interfaceNames = serverModel.operations.map((op) => op.interfaceName).sort();
    expect(interfaceNames).toEqual(["A", "B"]);
  });

  it("applies @makeOptional from an azurite.tsp-style overlay to relax a required base-spec property", async () => {
    const { program } = await ApiTester.compile({
      "base.tsp": `
        import "@typespec/http";
        using Http;

        @service
        namespace RequiredDemo;

        model Options {
          visibilityTimeout: int32;
        }

        @route("/options")
        @put
        op setOptions(@body options: Options): void;
      `,
      "azurite.tsp": `
        import "./base.tsp";
        import "@azure-tools/typespec-azurite-emitter";

        using RequiredDemo;
        using Azurite;

        @@makeOptional(RequiredDemo.Options.visibilityTimeout);
      `,
      "main.tsp": `
        import "./base.tsp";
        import "./azurite.tsp";
      `,
    });
    const serverModel = buildServerModel(program);

    const options = serverModel.models.find((m) => m.name === "Options")!;
    const visibilityTimeout = options.properties.find((p) => p.name === "visibilityTimeout")!;
    expect(visibilityTimeout.optional).toBe(true);
  });
});
