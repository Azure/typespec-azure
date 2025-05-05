import { deepStrictEqual, ok, strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { SdkHeaderParameter } from "../../src/interfaces.js";
import { createSdkTestRunner, SdkTestRunner } from "../test-host.js";
import { getServiceMethodOfClient } from "../utils.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});
async function compileVanillaWidgetService(runner: SdkTestRunner, code: string) {
  return await runner.compile(`
    @service(#{
      title: "Widget Service",
    })
    @versioned(Versions)
    namespace DemoService;

    /** The Contoso Widget Manager service version. */
    enum Versions {
      "2022-08-30",
    }

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

    @route("/widgets")
    @tag("Widgets")
    interface Widgets {
      ${code}
    }`);
}

it("vanilla widget create", async () => {
  await compileVanillaWidgetService(runner, "@post create(...Widget): Widget | Error;");

  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  strictEqual(method.name, "create");
  strictEqual(method.kind, "basic");
  strictEqual(method.parameters.length, 4);
  deepStrictEqual(
    method.parameters.map((x) => x.name),
    ["weight", "color", "contentType", "accept"],
  );

  const bodyParameter = method.operation.bodyParam;
  ok(bodyParameter);
  strictEqual(bodyParameter.kind, "body");
  strictEqual(bodyParameter.name, "createRequest");
  strictEqual(bodyParameter.onClient, false);
  strictEqual(bodyParameter.optional, false);
  strictEqual(bodyParameter.type.kind, "model");
  strictEqual(bodyParameter.type.name, "CreateRequest");
  strictEqual(bodyParameter.type.properties.length, 2);
  strictEqual(bodyParameter.correspondingMethodParams.length, 2);

  strictEqual(method.operation.parameters.length, 2);

  const headerParams = method.operation.parameters.filter(
    (x): x is SdkHeaderParameter => x.kind === "header",
  );
  strictEqual(headerParams.length, 2);
  const contentTypeOperationParam = headerParams.find((x) => x.serializedName === "Content-Type");
  ok(contentTypeOperationParam);
  strictEqual(contentTypeOperationParam.clientDefaultValue, undefined);
  strictEqual(contentTypeOperationParam.onClient, false);
  strictEqual(contentTypeOperationParam.optional, false);

  const contentTypeMethodParam = method.parameters.find((x) => x.name === "contentType");
  ok(contentTypeMethodParam);
  strictEqual(contentTypeMethodParam.clientDefaultValue, undefined);
  strictEqual(contentTypeMethodParam.onClient, false);
  strictEqual(contentTypeMethodParam.optional, false);

  strictEqual(contentTypeOperationParam.correspondingMethodParams[0], contentTypeMethodParam);

  const acceptOperationParam = headerParams.find((x) => x.serializedName === "Accept");
  ok(acceptOperationParam);
  strictEqual(acceptOperationParam.clientDefaultValue, undefined);
  strictEqual(acceptOperationParam.clientDefaultValue, undefined);
  strictEqual(acceptOperationParam.onClient, false);
  strictEqual(acceptOperationParam.optional, false);

  const acceptMethodParam = method.parameters.find((x) => x.name === "accept");
  ok(acceptMethodParam);
  strictEqual(acceptMethodParam.clientDefaultValue, undefined);
  strictEqual(acceptMethodParam.onClient, false);
  strictEqual(acceptMethodParam.optional, false);

  strictEqual(acceptOperationParam.correspondingMethodParams[0], acceptMethodParam);
});
it("vanilla widget read", async () => {
  await compileVanillaWidgetService(runner, "@get read(@path id: string): Widget | Error;");

  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  strictEqual(method.name, "read");
  strictEqual(method.kind, "basic");
  strictEqual(method.parameters.length, 2);

  const methodIdParam = method.parameters.find((x) => x.name === "id");
  ok(methodIdParam);
  strictEqual(methodIdParam.kind, "method");
  strictEqual(methodIdParam.optional, false);
  strictEqual(methodIdParam.onClient, false);
  strictEqual(methodIdParam.isApiVersionParam, false);
  strictEqual(methodIdParam.type.kind, "string");

  const methodAcceptParam = method.parameters.find((x) => x.name === "accept");
  ok(methodAcceptParam);
  strictEqual(methodAcceptParam.clientDefaultValue, undefined);

  const serviceOperation = method.operation;

  strictEqual(serviceOperation.parameters.length, 2);
  const pathParam = serviceOperation.parameters.find((x) => x.kind === "path");
  ok(pathParam);
  strictEqual(pathParam.kind, "path");
  strictEqual(pathParam.serializedName, "id");
  strictEqual(pathParam.name, "id");
  strictEqual(pathParam.optional, false);
  strictEqual(pathParam.onClient, false);
  strictEqual(pathParam.isApiVersionParam, false);
  strictEqual(pathParam.type.kind, "string");

  const operationAcceptParam = serviceOperation.parameters.find(
    (x) => x.kind === "header" && x.serializedName === "Accept",
  );
  ok(operationAcceptParam);
  strictEqual(operationAcceptParam.clientDefaultValue, undefined);

  strictEqual(operationAcceptParam.correspondingMethodParams[0], methodAcceptParam);

  const correspondingMethodParams = pathParam.correspondingMethodParams;
  strictEqual(correspondingMethodParams.length, 1);
  strictEqual(pathParam.name, correspondingMethodParams[0].name);
});
it("vanilla widget update", async () => {
  await compileVanillaWidgetService(runner, "@patch(#{implicitOptionality: true}) update(...Widget): Widget | Error;");

  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  strictEqual(method.name, "update");
  strictEqual(method.kind, "basic");
  strictEqual(method.parameters.length, 5);

  let methodParam = method.parameters[0];
  strictEqual(methodParam.kind, "method");
  strictEqual(methodParam.name, "id");
  strictEqual(methodParam.optional, false);
  strictEqual(methodParam.onClient, false);
  strictEqual(methodParam.isApiVersionParam, false);
  strictEqual(methodParam.type.kind, "string");

  methodParam = method.parameters[1];
  strictEqual(methodParam.kind, "method");
  strictEqual(methodParam.name, "weight");
  strictEqual(methodParam.optional, false);
  strictEqual(methodParam.onClient, false);
  strictEqual(methodParam.isApiVersionParam, false);
  strictEqual(methodParam.type.kind, "int32");

  methodParam = method.parameters[2];
  strictEqual(methodParam.kind, "method");
  strictEqual(methodParam.name, "color");
  strictEqual(methodParam.optional, false);
  strictEqual(methodParam.onClient, false);
  strictEqual(methodParam.isApiVersionParam, false);
  strictEqual(methodParam.type.kind, "enum");

  const methodContentTypeParam = method.parameters.find((x) => x.name === "contentType");
  ok(methodContentTypeParam);
  strictEqual(methodContentTypeParam.clientDefaultValue, undefined);
  strictEqual(methodContentTypeParam.optional, false);

  const methodAcceptParam = method.parameters.find((x) => x.name === "accept");
  ok(methodAcceptParam);
  strictEqual(methodAcceptParam.clientDefaultValue, undefined);
  strictEqual(methodAcceptParam.optional, false);

  const serviceOperation = method.operation;

  const pathParam = serviceOperation.parameters.find((x) => x.kind === "path");
  ok(pathParam);
  strictEqual(pathParam.kind, "path");
  strictEqual(pathParam.serializedName, "id");
  strictEqual(pathParam.name, "id");
  strictEqual(pathParam.optional, false);
  strictEqual(pathParam.onClient, false);
  strictEqual(pathParam.isApiVersionParam, false);
  strictEqual(pathParam.type.kind, "string");

  const bodyParameter = serviceOperation.bodyParam;
  ok(bodyParameter);

  strictEqual(bodyParameter.kind, "body");
  deepStrictEqual(bodyParameter.contentTypes, ["application/json"]);
  strictEqual(bodyParameter.defaultContentType, "application/json");
  strictEqual(bodyParameter.onClient, false);
  strictEqual(bodyParameter.optional, false);

  strictEqual(bodyParameter.type.kind, "model");
  strictEqual(bodyParameter.type, sdkPackage.models.filter((m) => m.name === "UpdateRequest")[0]);

  const headerParams = serviceOperation.parameters.filter(
    (x): x is SdkHeaderParameter => x.kind === "header",
  );
  const operationContentTypeParam = headerParams.find((x) => x.serializedName === "Content-Type");
  ok(operationContentTypeParam);
  strictEqual(operationContentTypeParam.clientDefaultValue, undefined);
  strictEqual(operationContentTypeParam.optional, false);

  const operationAcceptParam = headerParams.find((x) => x.serializedName === "Accept");
  ok(operationAcceptParam);
  strictEqual(operationAcceptParam.clientDefaultValue, undefined);
  strictEqual(operationAcceptParam.optional, false);

  const correspondingMethodParams = bodyParameter.correspondingMethodParams.map((x) => x.name);
  deepStrictEqual(correspondingMethodParams, ["weight", "color"]);

  strictEqual(operationContentTypeParam.correspondingMethodParams[0], methodContentTypeParam);
  strictEqual(operationAcceptParam.correspondingMethodParams[0], methodAcceptParam);
});
it("vanilla widget delete", async () => {
  await compileVanillaWidgetService(runner, "@delete delete(@path id: string): void | Error;");

  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  strictEqual(method.name, "delete");
  strictEqual(method.kind, "basic");
  strictEqual(method.parameters.length, 2);

  const methodParam = method.parameters[0];
  strictEqual(methodParam.kind, "method");
  strictEqual(methodParam.name, "id");
  strictEqual(methodParam.optional, false);
  strictEqual(methodParam.onClient, false);
  strictEqual(methodParam.isApiVersionParam, false);
  strictEqual(methodParam.type.kind, "string");

  const serviceOperation = method.operation;

  const pathParam = serviceOperation.parameters.find((x) => x.kind === "path");
  ok(pathParam);
  strictEqual(pathParam.kind, "path");
  strictEqual(pathParam.serializedName, "id");
  strictEqual(pathParam.name, "id");
  strictEqual(pathParam.optional, false);
  strictEqual(pathParam.onClient, false);
  strictEqual(pathParam.isApiVersionParam, false);
  strictEqual(pathParam.type.kind, "string");

  const correspondingMethodParams = pathParam.correspondingMethodParams;
  strictEqual(correspondingMethodParams.length, 1);
  strictEqual(pathParam.name, correspondingMethodParams[0].name);
});
it("vanilla widget list", async () => {
  await compileVanillaWidgetService(runner, "@get list(): Widget[] | Error;");

  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  strictEqual(method.name, "list");
  strictEqual(method.kind, "basic");
  strictEqual(method.parameters.length, 1);
  strictEqual(method.operation.bodyParam, undefined);
});
