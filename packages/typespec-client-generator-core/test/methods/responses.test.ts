import { deepStrictEqual, ok, strictEqual } from "assert";
import { it } from "vitest";
import { SdkHttpOperation, SdkMethodResponse, SdkServiceMethod } from "../../src/interfaces.js";
import { createSdkContextForTester, SimpleTester, SimpleTesterWithBuiltInService } from "../tester.js";
import { getServiceMethodOfClient } from "../utils.js";

it("basic returning void", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(
    `
    @error
    model Error {
      code: int32;
      message: string;
    }
    @delete op delete(@path id: string): void | Error;
    `,
  );
  const context = await createSdkContextForTester(program, { emitterName: "@azure-tools/typespec-python" });
  const sdkPackage = context.sdkPackage;
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
  strictEqual(method.response.resultSegments, undefined);
});

it("basic returning void and error model has status code", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(
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
  const context = await createSdkContextForTester(program, { emitterName: "@azure-tools/typespec-python" });
  const sdkPackage = context.sdkPackage;
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
  strictEqual(method.response.resultSegments, undefined);
});

it("basic returning compiler NotFoundResponse error", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(
    `
    @error
    model NotFoundErrorResponse is NotFoundResponse;
    @get op get(): void | NotFoundErrorResponse;
    `,
  );
  const context = await createSdkContextForTester(program, { emitterName: "@azure-tools/typespec-python" });
  const sdkPackage = context.sdkPackage;
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
  const { program } = await SimpleTesterWithBuiltInService.compile(
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
  const context = await createSdkContextForTester(program, { emitterName: "@azure-tools/typespec-python" });
  const sdkPackage = context.sdkPackage;
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
  strictEqual(method.response.resultSegments, undefined);
});

it("Headers and body", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(
    `
    model Widget {
      @header id: string;
      weight: int32;
    }

    op operation(): Widget;
    `,
  );
  const context = await createSdkContextForTester(program, { emitterName: "@azure-tools/typespec-python" });
  const sdkPackage = context.sdkPackage;
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
  strictEqual(method.response.resultSegments, undefined);
  const methodResponseType = method.response.type;
  ok(methodResponseType);
  strictEqual(
    methodResponseType,
    sdkPackage.models.find((x) => x.name === "Widget"),
  );
  strictEqual(methodResponseType.properties.length, 2);
});

it("Headers and body with null", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(
    `
    model Widget {
      weight: int32;
    }

    op operation(): {@header id: string | null, @body body: Widget | null};
    `,
  );
  const context = await createSdkContextForTester(program, { emitterName: "@azure-tools/typespec-python" });
  const sdkPackage = context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  const serviceResponses = method.operation.responses;

  const createResponse = serviceResponses.find((x) => x.statusCodes === 200);
  ok(createResponse);
  strictEqual(createResponse.headers[0].type.kind, "nullable");
  strictEqual(createResponse.type?.kind, "nullable");
  strictEqual(method.response.type?.kind, "nullable");
});

it("Distinguish nullable body from optional response", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(
    `
    model Widget {
      weight: int32;
    }

    // This has a nullable body (Widget | null) - explicitly marked with @body
    @route("/nullable")
    op operationWithNullableBody(): {@body body: Widget | null};
    
    // This has an optional response (200 with body, 204 without body)
    @route("/optional")
    op operationWithOptionalResponse(): Widget | NoContentResponse;
    `,
  );
  const context = await createSdkContextForTester(program, { emitterName: "@azure-tools/typespec-python" });
  const sdkPackage = context.sdkPackage;
  const methods = [...sdkPackage.clients[0].methods];

  // Test nullable body
  const methodWithNullableBody = methods.find((m) => m.name === "operationWithNullableBody");
  ok(methodWithNullableBody);
  strictEqual(methodWithNullableBody.response.type?.kind, "nullable");
  strictEqual(methodWithNullableBody.response.optional, false);

  // Test optional response
  const methodWithOptionalResponse = methods.find(
    (m) => m.name === "operationWithOptionalResponse",
  );
  ok(methodWithOptionalResponse);
  strictEqual(methodWithOptionalResponse.response.type?.kind, "model");
  strictEqual(methodWithOptionalResponse.response.optional, true);
});

it("OkResponse with NoContentResponse", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(
    `
    model Widget {
      weight: int32;
    }

    op operation(): Widget | NoContentResponse;
    `,
  );
  const context = await createSdkContextForTester(program, { emitterName: "@azure-tools/typespec-python" });
  const sdkPackage = context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  const serviceResponses = method.operation.responses;

  const okResponse = serviceResponses.find((x) => x.statusCodes === 200);
  ok(okResponse);

  const noContentResponse = serviceResponses.find((x) => x.statusCodes === 204);
  ok(noContentResponse);
  strictEqual(noContentResponse.type, undefined);
  strictEqual(method.response.type?.kind, "model");
  strictEqual(method.response.optional, true);
  strictEqual(
    method.response.type,
    sdkPackage.models.find((x) => x.name === "Widget"),
  );
});

it("NoContentResponse", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(
    `
    @delete op delete(@path id: string): NoContentResponse;
    `,
  );
  const context = await createSdkContextForTester(program, { emitterName: "@azure-tools/typespec-python" });
  const sdkPackage = context.sdkPackage;
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
  strictEqual(method.response.resultSegments, undefined);
});

it("binary return type", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(
    `
    op get(): {@header contentType: "image/jpeg"; @body image: bytes;};
    `,
  );
  const context = await createSdkContextForTester(program, { emitterName: "@azure-tools/typespec-python" });
  const sdkPackage = context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  const serviceResponse = method.operation.responses[0];
  deepStrictEqual(serviceResponse.contentTypes, ["image/jpeg"]);
  strictEqual(serviceResponse.type?.kind, "bytes");
  strictEqual(serviceResponse.type?.encode, "bytes");
});

it("protocol response usage", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(
    `
    model Test {
      prop: string;
    }

    @convenientAPI(false)
    op get(): Test;
    `,
  );
  const context = await createSdkContextForTester(program, { emitterName: "@azure-tools/typespec-python" });
  const sdkPackage = context.sdkPackage;
  strictEqual(sdkPackage.models.length, 0);
  const method = getServiceMethodOfClient(sdkPackage);
  strictEqual(method.response.type?.kind, "model");
  strictEqual(method.response.type.usage, 0);
});

it("response model with property with none visibility", async function () {
  const { program } = await SimpleTesterWithBuiltInService.compile(`
    model Test{
        prop: string;
        @invisible(Lifecycle)
        nonProp: string;
    }
    op get(): Test;
  `);
  const context = await createSdkContextForTester(program, { emitterName: "@azure-tools/typespec-python" });
  const sdkPackage = context.sdkPackage;
  const models = sdkPackage.models;
  strictEqual(models.length, 1);
  strictEqual(models[0].properties.length, 1);
  strictEqual(
    (sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>).response.type,
    models[0],
  );
});

it("rename for response header", async function () {
  const { program } = await SimpleTesterWithBuiltInService.compile(`
    model Test{
        prop: string;
    }
    op get(): {@header @clientName("xRename") x: string};
    `);
  const context = await createSdkContextForTester(program, { emitterName: "@azure-tools/typespec-python" });
  const sdkPackage = context.sdkPackage;
  const method = sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>;
  const header = method.operation.responses[0].headers[0];
  strictEqual(header.serializedName, "x");
  strictEqual(header.name, "xRename");
});

it("content type shall be included in response headers", async () => {
  const { program } = await SimpleTester.compile(`
    @service
    namespace TestClient {
      op get(): OkResponse & {@header("Content-Type") contentType: string; @bodyRoot body: bytes};
    }
  `);
  const context = await createSdkContextForTester(program, { emitterName: "@azure-tools/typespec-python" });
  const client = context.sdkPackage.clients[0];
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
  const { program } = await SimpleTester.compile(`
    @service
    namespace TestClient {
      op get(): Test;

      @doc("description on response")
      model Test {
        @body body: string;
      }
    }
  `);
  const context = await createSdkContextForTester(program, { emitterName: "@azure-tools/typespec-python" });
  const client = context.sdkPackage.clients[0];
  ok(client);
  const method = client.methods[0];
  ok(method);
  strictEqual(method.kind, "basic");
  const responses = Array.from(method.operation.responses.values());
  strictEqual(responses.length, 1);
  strictEqual(responses[0].description, "description on response");
});

it("response body with non-read visibility", async () => {
  const { program } = await SimpleTester.compile(`
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
  const context = await createSdkContextForTester(program, { emitterName: "@azure-tools/typespec-python" });
  const models = context.sdkPackage.models;
  strictEqual(models.length, 1);
  const model = models[0];
  strictEqual(model.name, "Test");
  const client = context.sdkPackage.clients[0];
  ok(client);
  const method = client.methods[0];
  ok(method);
  strictEqual((method.response as SdkMethodResponse).type, model);
});

it("response body of scalar with encode", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(
    `
    @encode(BytesKnownEncoding.base64url)
    scalar base64urlBytes extends bytes;
    
    op get(): {@header contentType: "application/json", @body body: base64urlBytes;};
    `,
  );
  const context = await createSdkContextForTester(program, { emitterName: "@azure-tools/typespec-python" });
  const sdkPackage = context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  const serviceResponse = method.operation.responses[0];
  deepStrictEqual(serviceResponse.contentTypes, ["application/json"]);
  strictEqual(serviceResponse.type?.kind, "bytes");
  strictEqual(serviceResponse.type?.encode, "base64url");
});

it("multiple response types for one status code", async () => {
  const { program } = await SimpleTester.diagnose(`
    @service
    namespace TestService {
      model One {
        name: string;
      }
      model Two {
        age: int32;
      }
      op doStuff(): One | Two;
    }
  `);
  const context = await createSdkContextForTester(program, { emitterName: "@azure-tools/typespec-python" });
  const sdkPackage = context.sdkPackage;
  strictEqual(sdkPackage.models.length, 2);
  const oneModel = sdkPackage.models.find((m) => m.name === "One");
  const twoModel = sdkPackage.models.find((m) => m.name === "Two");
  ok(oneModel);
  ok(twoModel);
  const method = getServiceMethodOfClient(sdkPackage);
  const methodResponseType = method.response.type;
  ok(methodResponseType);
  strictEqual(methodResponseType.kind, "union");
  ok(methodResponseType.variantTypes.find((x) => x === oneModel));
  ok(methodResponseType.variantTypes.find((x) => x === twoModel));
  const serviceResponses = method.operation.responses;
  strictEqual(serviceResponses.length, 1);
  const serviceResponseType = serviceResponses[0].type;
  ok(serviceResponseType);
  strictEqual(serviceResponseType.kind, "union");
  ok(serviceResponseType.variantTypes.find((x) => x === oneModel));
  ok(serviceResponseType.variantTypes.find((x) => x === twoModel));
});

it("multiple response types for one status code plus additional model for other status code", async () => {
  const { program } = await SimpleTester.diagnose(`
    @service
    namespace TestService {
      model One {
        name: string;
      }
      model Two {
        age: int32;
      }
      @get
      op doStuff(): {
        @statusCode statusCode: 200;
        @body body: One | Two
      } | {
        @statusCode statusCode: 202;
        @body body: string;
      };
    }
  `);
  const context = await createSdkContextForTester(program, { emitterName: "@azure-tools/typespec-python" });
  const sdkPackage = context.sdkPackage;
  strictEqual(sdkPackage.models.length, 2);
  const oneModel = sdkPackage.models.find((m) => m.name === "One");
  const twoModel = sdkPackage.models.find((m) => m.name === "Two");
  ok(oneModel);
  ok(twoModel);
  const method = getServiceMethodOfClient(sdkPackage);
  const methodResponseType = method.response.type;
  ok(methodResponseType);
  strictEqual(methodResponseType.kind, "union");
  strictEqual(methodResponseType.variantTypes.length, 2);
  const [firstVariant, secondVariant] = methodResponseType.variantTypes;
  ok(firstVariant);
  ok(secondVariant);
  strictEqual(firstVariant.kind, "union");
  ok(firstVariant.variantTypes.find((x) => x === oneModel));
  ok(firstVariant.variantTypes.find((x) => x === twoModel));
  strictEqual(secondVariant.kind, "string");
  const serviceResponses = method.operation.responses;
  strictEqual(serviceResponses.length, 2);
  const unionServiceResponseType = serviceResponses[0].type;
  ok(unionServiceResponseType);
  strictEqual(unionServiceResponseType.kind, "union");
  ok(unionServiceResponseType.variantTypes.find((x) => x === oneModel));
  ok(unionServiceResponseType.variantTypes.find((x) => x === twoModel));

  const stringServiceResponseType = serviceResponses[1].type;
  ok(stringServiceResponseType);
  strictEqual(stringServiceResponseType.kind, "string");
});
