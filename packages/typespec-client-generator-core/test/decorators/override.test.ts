import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { expectDiagnostics } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { UsageFlags } from "../../src/interfaces.js";
import { createSdkTestRunner, SdkTestRunner } from "../test-host.js";

describe("typespec-client-generator-core: @override", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
  });

  it("basic", async () => {
    await runner.compileWithCustomization(
      `
      @service
      namespace MyService;
      model Params {
        foo: string;
        bar: string;
      }

      op func(...Params): void;
      `,
      `
      namespace MyCustomizations;

      op func(params: MyService.Params): void;

      @@override(MyService.func, MyCustomizations.func);
      `,
    );
    const sdkPackage = runner.context.sdkPackage;

    const paramsModel = sdkPackage.models.find((x) => x.name === "Params");
    ok(paramsModel);

    const client = sdkPackage.clients[0];
    strictEqual(client.methods.length, 1);
    const method = client.methods[0];

    strictEqual(method.kind, "basic");
    strictEqual(method.name, "func");
    strictEqual(method.parameters.length, 2);
    const contentTypeParam = method.parameters.find((x) => x.name === "contentType");
    ok(contentTypeParam);
    const paramsParam = method.parameters.find((x) => x.name === "params");
    ok(paramsParam);
    strictEqual(paramsModel, paramsParam.type);

    ok(method.operation.bodyParam);
    strictEqual(method.operation.bodyParam.correspondingMethodParams.length, 2);
    strictEqual(method.operation.bodyParam.correspondingMethodParams[0], paramsModel.properties[0]);
    strictEqual(method.operation.bodyParam.correspondingMethodParams[1], paramsModel.properties[1]);
  });

  it("basic with scope", async () => {
    const mainCode = `
      @service
      namespace MyService;
      model Params {
        foo: string;
        bar: string;
      }

      op func(...Params): void;
      `;

    const customizationCode = `
      namespace MyCustomizations;

      op func(params: MyService.Params): void;

      @@override(MyService.func, MyCustomizations.func, "csharp");
      `;
    await runner.compileWithCustomization(mainCode, customizationCode);
    // runner has python scope, so shouldn't be overridden

    ok(runner.context.sdkPackage.models.find((x) => x.name === "Params"));
    const sdkPackage = runner.context.sdkPackage;
    const client = sdkPackage.clients[0];
    strictEqual(client.methods.length, 1);
    const method = client.methods[0];
    strictEqual(method.kind, "basic");
    strictEqual(method.name, "func");
    strictEqual(method.parameters.length, 3);

    const contentTypeParam = method.parameters.find((x) => x.name === "contentType");
    ok(contentTypeParam);

    const fooParam = method.parameters.find((x) => x.name === "foo");
    ok(fooParam);

    const barParam = method.parameters.find((x) => x.name === "bar");
    ok(barParam);

    const httpOp = method.operation;
    strictEqual(httpOp.parameters.length, 1);
    strictEqual(httpOp.parameters[0].correspondingMethodParams[0], contentTypeParam);

    ok(httpOp.bodyParam);
    strictEqual(httpOp.bodyParam.correspondingMethodParams.length, 2);
    strictEqual(httpOp.bodyParam.correspondingMethodParams[0], fooParam);
    strictEqual(httpOp.bodyParam.correspondingMethodParams[1], barParam);

    const runnerWithCsharp = await createSdkTestRunner({
      emitterName: "@azure-tools/typespec-csharp",
    });
    await runnerWithCsharp.compileWithCustomization(mainCode, customizationCode);
    const paramModel = runnerWithCsharp.context.sdkPackage.models.find((x) => x.name === "Params");
    ok(paramModel);

    const sdkPackageWithCsharp = runnerWithCsharp.context.sdkPackage;
    strictEqual(sdkPackageWithCsharp.clients.length, 1);

    strictEqual(sdkPackageWithCsharp.clients[0].methods.length, 1);
    const methodWithCsharp = sdkPackageWithCsharp.clients[0].methods[0];
    strictEqual(methodWithCsharp.kind, "basic");
    strictEqual(methodWithCsharp.name, "func");
    strictEqual(methodWithCsharp.parameters.length, 2);
    const contentTypeParamWithCsharp = methodWithCsharp.parameters.find(
      (x) => x.name === "contentType",
    );
    ok(contentTypeParamWithCsharp);

    const paramsParamWithCsharp = methodWithCsharp.parameters.find((x) => x.name === "params");
    ok(paramsParamWithCsharp);
    strictEqual(paramModel, paramsParamWithCsharp.type);

    const httpOpWithCsharp = methodWithCsharp.operation;
    strictEqual(httpOpWithCsharp.parameters.length, 1);
    strictEqual(
      httpOpWithCsharp.parameters[0].correspondingMethodParams[0],
      contentTypeParamWithCsharp,
    );
    ok(httpOpWithCsharp.bodyParam);
    strictEqual(httpOpWithCsharp.bodyParam.correspondingMethodParams.length, 2);
    strictEqual(httpOpWithCsharp.bodyParam.correspondingMethodParams[0], paramModel.properties[0]);
    strictEqual(httpOpWithCsharp.bodyParam.correspondingMethodParams[1], paramModel.properties[1]);
  });

  it("regrouping", async () => {
    const mainCode = `
      @service
      namespace MyService;
      model Params {
        foo: string;
        bar: string;
        fooBar: string;
      }

      op func(...Params): void;
      `;

    const customizationCode = `
      namespace MyCustomizations;

      model ParamsCustomized {
        ...PickProperties<MyService.Params, "foo" | "bar">;
      }

      op func(params: MyCustomizations.ParamsCustomized, ...PickProperties<MyService.Params, "fooBar">): void;

      @@override(MyService.func, MyCustomizations.func);
      `;
    await runner.compileWithCustomization(mainCode, customizationCode);
    // runner has python scope, so shouldn't be overridden

    const sdkPackage = runner.context.sdkPackage;
    const client = sdkPackage.clients[0];
    strictEqual(client.methods.length, 1);
    const method = client.methods[0];
    strictEqual(method.kind, "basic");
    strictEqual(method.name, "func");
    strictEqual(method.parameters.length, 3);

    const contentTypeParam = method.parameters.find((x) => x.name === "contentType");
    ok(contentTypeParam);

    const paramsParam = method.parameters.find((x) => x.name === "params");
    ok(paramsParam);

    const fooBarParam = method.parameters.find((x) => x.name === "fooBar");
    ok(fooBarParam);

    const httpOp = method.operation;
    strictEqual(httpOp.parameters.length, 1);
    strictEqual(httpOp.parameters[0].correspondingMethodParams[0], contentTypeParam);

    strictEqual(sdkPackage.models.length, 2);
    const paramsModel = sdkPackage.models.find((x) => x.name === "Params");
    ok(paramsModel);
    strictEqual(paramsModel.usage, UsageFlags.Spread | UsageFlags.Json);
    const paramsCustomizedModel = sdkPackage.models.find((x) => x.name === "ParamsCustomized");
    ok(paramsCustomizedModel);
    strictEqual(paramsCustomizedModel.usage, UsageFlags.Input);

    ok(httpOp.bodyParam);
    strictEqual(httpOp.bodyParam.correspondingMethodParams.length, 3);
    strictEqual(httpOp.bodyParam.correspondingMethodParams[0], paramsCustomizedModel.properties[0]);
    strictEqual(httpOp.bodyParam.correspondingMethodParams[1], paramsCustomizedModel.properties[1]);
    strictEqual(httpOp.bodyParam.correspondingMethodParams[2], fooBarParam);
  });

  it("params mismatch", async () => {
    const mainCode = `
      @service
      namespace MyService;
      model Params {
        foo: string;
        bar: string;
      }

      op func(...Params): void;
      `;

    const customizationCode = `
      namespace MyCustomizations;

      model ParamsCustomized {
        foo: string;
        bar: string;
      }

      op func(params: MyCustomizations.ParamsCustomized): void;

      @@override(MyService.func, MyCustomizations.func);
      `;
    const diagnostics = (
      await runner.compileAndDiagnoseWithCustomization(mainCode, customizationCode)
    )[1];
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/override-method-parameters-mismatch",
    });
  });

  it("recursive params", async () => {
    await runner.compileWithCustomization(
      `
      @service
      namespace MyService;
      model Params {
        foo: string;
        params: Params[];
      }

      op func(...Params): void;
      `,
      `
      namespace MyCustomizations;

      op func(input: MyService.Params): void;

      @@override(MyService.func, MyCustomizations.func);
      `,
    );
    const sdkPackage = runner.context.sdkPackage;

    const paramsModel = sdkPackage.models.find((x) => x.name === "Params");
    ok(paramsModel);

    const client = sdkPackage.clients[0];
    strictEqual(client.methods.length, 1);
    const method = client.methods[0];

    strictEqual(method.kind, "basic");
    strictEqual(method.name, "func");
    strictEqual(method.parameters.length, 2);
    const contentTypeParam = method.parameters.find((x) => x.name === "contentType");
    ok(contentTypeParam);
    const inputParam = method.parameters.find((x) => x.name === "input");
    ok(inputParam);
    strictEqual(paramsModel, inputParam.type);

    ok(method.operation.bodyParam);
    strictEqual(method.operation.bodyParam.correspondingMethodParams.length, 2);
    strictEqual(method.operation.bodyParam.correspondingMethodParams[0], paramsModel.properties[0]);
    strictEqual(method.operation.bodyParam.correspondingMethodParams[1], paramsModel.properties[1]);
  });

  it("core template", async () => {
    const runnerWithCore = await createSdkTestRunner({
      librariesToAdd: [AzureCoreTestLibrary],
      autoUsings: ["Azure.Core"],
      emitterName: "@azure-tools/typespec-java",
    });
    await runnerWithCore.compileWithCustomization(
      `
      @useDependency(Versions.v1_0_Preview_2)
      @server("http://localhost:3000", "endpoint")
      @service()
      namespace My.Service;

      model Params {
        foo: string;
        params: Params[];
      }

      @route("/template")
      op templateOp is Azure.Core.RpcOperation<
        Params,
        Params
      >;
      `,
      `
      namespace My.Customizations;

      op templateOp(params: My.Service.Params, ...Azure.Core.Foundations.ApiVersionParameter): My.Service.Params;

      @@override(My.Service.templateOp, My.Customizations.templateOp);
      `,
    );
    const sdkPackage = runnerWithCore.context.sdkPackage;
    const method = sdkPackage.clients[0].methods[0];
    strictEqual(method.parameters.length, 3);
    ok(method.parameters.find((x) => x.name === "contentType"));
    ok(method.parameters.find((x) => x.name === "accept"));

    const paramsParam = method.parameters.find((x) => x.name === "params");
    ok(paramsParam);
    strictEqual(paramsParam.type.kind, "model");
    strictEqual(paramsParam.type.name, "Params");
  });
});
