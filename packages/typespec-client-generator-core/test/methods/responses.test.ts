import { deepStrictEqual, ok, strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { SdkHttpOperation, SdkMethodResponse, SdkServiceMethod } from "../../src/interfaces.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";
import { getServiceMethodOfClient } from "../utils.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});

it("basic returning void", async () => {
  await runner.compileWithBuiltInService(
    `
    @error
    model Error {
      code: int32;
      message: string;
    }
    @delete op delete(@path id: string): void | Error;
    `,
  );
  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  strictEqual(sdkPackage.models.length, 1);
  strictEqual(method.name, "delete");
  const serviceResponses = method.operation.responses;
  strictEqual(serviceResponses.length, 1);

  const voidResponse = serviceResponses.find((x) => x.statusCodes === 204);
  ok(voidResponse);
  strictEqual(voidResponse.kind, "http");
  strictEqual(voidResponse.type, undefined);
  strictEqual(voidResponse.headers.length, 0);

  const errorResponse = method.operation.exceptions.find((x) => x.statusCodes === "*");
  ok(errorResponse);
  strictEqual(errorResponse.kind, "http");
  ok(errorResponse.type);
  strictEqual(errorResponse.type.kind, "model");
  strictEqual(errorResponse.type, sdkPackage.models[0]);

  strictEqual(method.response.type, undefined);
  strictEqual(method.response.resultPath, undefined);
});

it("basic returning void and error model has status code", async () => {
  await runner.compileWithBuiltInService(
    `
    @error
    model Error {
      @statusCode _: 403;
      code: int32;
      message: string;
    }
    @delete op delete(@path id: string): void | Error;
    `,
  );
  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  strictEqual(sdkPackage.models.length, 1);
  strictEqual(method.name, "delete");
  const serviceResponses = method.operation.responses;
  strictEqual(serviceResponses.length, 1);

  const voidResponse = serviceResponses.find((x) => x.statusCodes === 204);
  ok(voidResponse);
  strictEqual(voidResponse.kind, "http");
  strictEqual(voidResponse.type, undefined);
  strictEqual(voidResponse.headers.length, 0);

  const errorResponse = method.operation.exceptions.find((x) => x.statusCodes === 403);
  ok(errorResponse);
  strictEqual(errorResponse.kind, "http");
  ok(errorResponse.type);
  strictEqual(errorResponse.type.kind, "model");
  strictEqual(errorResponse.type, sdkPackage.models[0]);

  strictEqual(method.response.type, undefined);
  strictEqual(method.response.resultPath, undefined);
});

it("basic returning compiler NotFoundResponse error", async () => {
  await runner.compileWithBuiltInService(
    `
    @error
    model NotFoundErrorResponse is NotFoundResponse;
    @get op get(): void | NotFoundErrorResponse;
    `,
  );
  const sdkPackage = runner.context.sdkPackage;
  const client = sdkPackage.clients[0];
  const getMethod = client.methods[0];
  strictEqual(getMethod.kind, "basic");
  const operation = getMethod.operation;
  strictEqual(operation.responses.length, 1);
  strictEqual(operation.responses[0].statusCodes, 204);
  strictEqual(operation.exceptions.length, 1);
  const exception = operation.exceptions[0];
  strictEqual(exception.statusCodes, 404);
});

it("basic returning model", async () => {
  await runner.compileWithBuiltInService(
    `
    model Widget {
      @visibility(Lifecycle.Read, Lifecycle.Update)
      @path
      id: string;

      weight: int32;
      color: "red" | "blue";
    }

    @error
    model Error {
      code: int32;
      message: string;
    }
    @post op create(...Widget): Widget | Error;
    `,
  );
  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  strictEqual(sdkPackage.models.length, 3);
  strictEqual(method.name, "create");
  const serviceResponses = method.operation.responses;
  strictEqual(serviceResponses.length, 1);

  const createResponse = serviceResponses.find((x) => x.statusCodes === 200);
  ok(createResponse);
  strictEqual(createResponse.kind, "http");
  strictEqual(
    createResponse.type,
    sdkPackage.models.find((x) => x.name === "Widget"),
  );
  strictEqual(createResponse.headers.length, 0);

  const errorResponse = method.operation.exceptions.find((x) => x.statusCodes === "*");
  ok(errorResponse);
  strictEqual(errorResponse.kind, "http");
  ok(errorResponse.type);
  strictEqual(errorResponse.type.kind, "model");
  strictEqual(
    errorResponse.type,
    sdkPackage.models.find((x) => x.name === "Error"),
  );

  strictEqual(method.response.kind, "method");
  const methodResponseType = method.response.type;
  strictEqual(methodResponseType, createResponse.type);
  strictEqual(method.response.resultPath, undefined);
});

it("Headers and body", async () => {
  await runner.compileWithBuiltInService(
    `
    model Widget {
      @header id: string;
      weight: int32;
    }

    op operation(): Widget;
    `,
  );
  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  strictEqual(sdkPackage.models.length, 1);
  strictEqual(method.name, "operation");
  const serviceResponses = method.operation.responses;
  strictEqual(serviceResponses.length, 1);

  strictEqual(method.parameters.length, 1);

  const createResponse = serviceResponses.find((x) => x.statusCodes === 200);
  ok(createResponse);
  strictEqual(createResponse.kind, "http");
  strictEqual(
    createResponse.type,
    sdkPackage.models.find((x) => x.name === "Widget"),
  );
  strictEqual(createResponse.headers.length, 1);
  strictEqual(createResponse.headers[0].serializedName, "id");

  strictEqual(method.response.kind, "method");
  strictEqual(method.response.resultPath, undefined);
  const methodResponseType = method.response.type;
  ok(methodResponseType);
  strictEqual(
    methodResponseType,
    sdkPackage.models.find((x) => x.name === "Widget"),
  );
  strictEqual(methodResponseType.properties.length, 2);
});

it("Headers and body with null", async () => {
  await runner.compileWithBuiltInService(
    `
    model Widget {
      weight: int32;
    }

    op operation(): {@header id: string | null, @body body: Widget | null};
    `,
  );
  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  const serviceResponses = method.operation.responses;

  const createResponse = serviceResponses.find((x) => x.statusCodes === 200);
  ok(createResponse);
  strictEqual(createResponse.headers[0].type.kind, "nullable");
  strictEqual(createResponse.type?.kind, "nullable");
  strictEqual(method.response.type?.kind, "nullable");
});

it("OkResponse with NoContentResponse", async () => {
  await runner.compileWithBuiltInService(
    `
    model Widget {
      weight: int32;
    }

    op operation(): Widget | NoContentResponse;
    `,
  );
  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  const serviceResponses = method.operation.responses;

  const okResponse = serviceResponses.find((x) => x.statusCodes === 200);
  ok(okResponse);

  const noContentResponse = serviceResponses.find((x) => x.statusCodes === 204);
  ok(noContentResponse);
  strictEqual(noContentResponse.type, undefined);
  strictEqual(method.response.type?.kind, "nullable");
  strictEqual(
    method.response.type?.type,
    sdkPackage.models.find((x) => x.name === "Widget"),
  );
});

it("NoContentResponse", async () => {
  await runner.compileWithBuiltInService(
    `
    @delete op delete(@path id: string): NoContentResponse;
    `,
  );
  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  strictEqual(sdkPackage.models.length, 0);
  strictEqual(method.name, "delete");
  strictEqual(method.response.type, undefined);
  const serviceResponses = method.operation.responses;
  strictEqual(serviceResponses.length, 1);

  const voidResponse = serviceResponses.find((x) => x.statusCodes === 204);
  ok(voidResponse);
  strictEqual(voidResponse.kind, "http");
  strictEqual(voidResponse.type, undefined);
  strictEqual(voidResponse.headers.length, 0);
  strictEqual(voidResponse.contentTypes, undefined);

  strictEqual(method.response.type, undefined);
  strictEqual(method.response.resultPath, undefined);
});

it("binary return type", async () => {
  await runner.compileWithBuiltInService(
    `
    op get(): {@header contentType: "image/jpeg"; @body image: bytes;};
    `,
  );
  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  const serviceResponse = method.operation.responses[0];
  deepStrictEqual(serviceResponse.contentTypes, ["image/jpeg"]);
  strictEqual(serviceResponse.type?.kind, "bytes");
  strictEqual(serviceResponse.type?.encode, "bytes");
});

it("protocol response usage", async () => {
  await runner.compileWithBuiltInService(
    `
    model Test {
      prop: string;
    }

    @convenientAPI(false)
    op get(): Test;
    `,
  );
  const sdkPackage = runner.context.sdkPackage;
  strictEqual(sdkPackage.models.length, 0);
  const method = getServiceMethodOfClient(sdkPackage);
  strictEqual(method.response.type?.kind, "model");
  strictEqual(method.response.type.usage, 0);
});

it("response model with property with none visibility", async function () {
  await runner.compileWithBuiltInService(`
    model Test{
        prop: string;
        @invisible(Lifecycle)
        nonProp: string;
    }
    op get(): Test;
  `);
  const sdkPackage = runner.context.sdkPackage;
  const models = sdkPackage.models;
  strictEqual(models.length, 1);
  strictEqual(models[0].properties.length, 1);
  strictEqual(
    (sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>).response.type,
    models[0],
  );
});

it("rename for response header", async function () {
  await runner.compileWithBuiltInService(`
    model Test{
        prop: string;
    }
    op get(): {@header @clientName("xRename") x: string};
    `);
  const sdkPackage = runner.context.sdkPackage;
  const method = sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>;
  const header = method.operation.responses[0].headers[0];
  strictEqual(header.serializedName, "x");
  strictEqual(header.name, "xRename");
});

it("content type shall be included in response headers", async () => {
  await runner.compile(`
    @service
    namespace TestClient {
      op get(): OkResponse & {@header("Content-Type") contentType: string; @bodyRoot body: bytes};
    }
  `);
  const client = runner.context.sdkPackage.clients[0];
  ok(client);
  const method = client.methods[0];
  ok(method);
  strictEqual(method.kind, "basic");
  const responses = Array.from(method.operation.responses.values());
  strictEqual(responses.length, 1);
  strictEqual(responses[0].headers.length, 1);
  strictEqual(responses[0].headers[0].serializedName, "Content-Type");
});

it("description shall be included in response", async () => {
  await runner.compile(`
    @service
    namespace TestClient {
      op get(): Test;

      @doc("description on response")
      model Test {
        @body body: string;
      }
    }
  `);
  const client = runner.context.sdkPackage.clients[0];
  ok(client);
  const method = client.methods[0];
  ok(method);
  strictEqual(method.kind, "basic");
  const responses = Array.from(method.operation.responses.values());
  strictEqual(responses.length, 1);
  strictEqual(responses[0].description, "description on response");
});

it("response body with non-read visibility", async () => {
  await runner.compile(`
    @service
    namespace TestClient {
      model Test {
        @visibility(Lifecycle.Create)
        create: string;

        read: string;
      }

      op get(): Test;
    }
  `);
  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 1);
  const model = models[0];
  strictEqual(model.name, "Test");
  const client = runner.context.sdkPackage.clients[0];
  ok(client);
  const method = client.methods[0];
  ok(method);
  strictEqual((method.response as SdkMethodResponse).type, model);
});
