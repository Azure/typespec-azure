import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { AzureResourceManagerTestLibrary } from "@azure-tools/typespec-azure-resource-manager/testing";
import { expectDiagnostics } from "@typespec/compiler/testing";
import { OpenAPITestLibrary } from "@typespec/openapi/testing";
import { ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { SdkHttpOperation, SdkServiceMethod } from "../../src/interfaces.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});

describe("Operation", () => {
  it("@clientLocation along with @client", async () => {
    const diagnostics = (
      await runner.compileAndDiagnoseWithCustomization(
        `
    @service
    namespace MyService;

    op test(): string;
  `,
        `
    @client({service: MyService})
    namespace MyServiceClient;

    @clientLocation("Inner")
    op test is MyService.test;
  `,
      )
    )[1];

    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/client-location-conflict",
    });
  });

  it("@clientLocation along with @operationGroup", async () => {
    const diagnostics = (
      await runner.compileAndDiagnoseWithCustomization(
        `
    @service
    namespace MyService;

    op test(): string;
  `,
        `
    namespace Customization;

    @operationGroup
    interface MyOperationGroup {
      @clientLocation("Inner")
      op test is MyService.test;
    }
  `,
      )
    )[1];

    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/client-location-conflict",
    });
  });

  it("@clientLocation client-location-wrong-type", async () => {
    const [_, diagnostics] = await runner.compileAndDiagnose(
      `
    @service
    namespace TestService{
      @clientLocation(Test)
      op test(): string;
    }

    namespace Test{
    }
  `,
    );

    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/client-location-wrong-type",
    });
    const sdkPackage = runner.context.sdkPackage;
    const rootClient = sdkPackage.clients.find((c) => c.name === "TestServiceClient");
    ok(rootClient);
    strictEqual(rootClient.children, undefined);
    strictEqual(rootClient.methods.length, 1);
    strictEqual(rootClient.methods[0].name, "test");
  });

  it("@clientLocation client-location-duplicate", async () => {
    const [_, diagnostics] = await runner.compileAndDiagnose(
      `
    @service
    namespace TestService;

    interface A {
      @route("/a1")
      op a1(): void;

      @route("/a2")
      @clientLocation("B")
      op a2(): void;
    }

    interface B {
      @route("/b")
      op b(): void;
    }
  `,
    );

    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/client-location-duplicate",
    });
    const sdkPackage = runner.context.sdkPackage;
    const rootClient = sdkPackage.clients.find((c) => c.name === "TestServiceClient");
    ok(rootClient);
    strictEqual(rootClient.children?.length, 2);
    const aClient = rootClient.children.find((c) => c.name === "A");
    ok(aClient);
    strictEqual(aClient.methods.length, 2);
    strictEqual(aClient.methods[0].name, "a1");
    strictEqual(aClient.methods[1].name, "a2");

    const bClient = rootClient.children.find((c) => c.name === "B");
    ok(bClient);
    strictEqual(bClient.methods.length, 1);
    strictEqual(bClient.methods[0].name, "b");
  });

  it("move an operation to another operation group", async () => {
    await runner.compileWithBuiltInService(
      `
    interface A {
      @route("/a1")
      op a1(): void;

      @route("/a2")
      @clientLocation(B)
      op a2(): void;
    }

    interface B {
      @route("/b")
      op b(): void;
    }
  `,
    );

    const sdkPackage = runner.context.sdkPackage;
    const rootClient = sdkPackage.clients.find((c) => c.name === "TestServiceClient");
    ok(rootClient);
    strictEqual(rootClient.children?.length, 2);
    const aClient = rootClient.children.find((c) => c.name === "A");
    ok(aClient);
    strictEqual(aClient.methods.length, 1);
    strictEqual(aClient.methods[0].name, "a1");
    const bClient = rootClient.children.find((c) => c.name === "B");
    ok(bClient);
    strictEqual(bClient.methods.length, 2);
    strictEqual(bClient.methods[0].name, "b");
    strictEqual(bClient.methods[1].name, "a2");
  });

  it("move an operation to another operation group and omit the original operation group", async () => {
    await runner.compileWithBuiltInService(
      `
    interface A {
      @route("/a")
      @clientLocation(B)
      op a(): void;
    }

    interface B {
      @route("/b")
      op b(): void;
    }
  `,
    );

    const sdkPackage = runner.context.sdkPackage;
    const rootClient = sdkPackage.clients.find((c) => c.name === "TestServiceClient");
    ok(rootClient);
    strictEqual(rootClient.children?.length, 1);
    const bClient = rootClient.children.find((c) => c.name === "B");
    ok(bClient);
    strictEqual(bClient.methods.length, 2);
    strictEqual(bClient.methods[0].name, "b");
    strictEqual(bClient.methods[1].name, "a");
  });

  it("move an operation to a new opeartion group", async () => {
    await runner.compileWithBuiltInService(
      `
    interface A {
      @route("/a1")
      op a1(): void;

      @route("/a2")
      @clientLocation("B")
      op a2(): void;
    }
  `,
    );

    const sdkPackage = runner.context.sdkPackage;
    const rootClient = sdkPackage.clients.find((c) => c.name === "TestServiceClient");
    ok(rootClient);
    strictEqual(rootClient.children?.length, 2);
    const aClient = rootClient.children.find((c) => c.name === "A");
    ok(aClient);
    strictEqual(aClient.methods.length, 1);
    strictEqual(aClient.methods[0].name, "a1");
    const bClient = rootClient.children.find((c) => c.name === "B");
    ok(bClient);
    strictEqual(bClient.methods.length, 1);
    strictEqual(bClient.methods[0].name, "a2");
  });

  it("move an operation to a new operation group and omit the original operation group", async () => {
    await runner.compileWithBuiltInService(
      `
    interface A {
      @route("/a")
      @clientLocation("B")
      op a(): void;
    }
  `,
    );

    const sdkPackage = runner.context.sdkPackage;
    const rootClient = sdkPackage.clients.find((c) => c.name === "TestServiceClient");
    ok(rootClient);
    strictEqual(rootClient.children?.length, 1);
    const bClient = rootClient.children.find((c) => c.name === "B");
    ok(bClient);
    strictEqual(bClient.methods.length, 1);
    strictEqual(bClient.methods[0].name, "a");
  });

  it("move an operation to root client", async () => {
    await runner.compileWithBuiltInService(
      `
    interface A {
      @route("/a1")
      op a1(): void;

      @route("/a2")
      @clientLocation(TestService)
      op a2(): void;
    }
  `,
    );

    const sdkPackage = runner.context.sdkPackage;
    const rootClient = sdkPackage.clients.find((c) => c.name === "TestServiceClient");
    ok(rootClient);
    strictEqual(rootClient.children?.length, 1);
    const aClient = rootClient.children.find((c) => c.name === "A");
    ok(aClient);
    strictEqual(aClient.methods.length, 1);
    strictEqual(aClient.methods[0].name, "a1");
    strictEqual(rootClient.methods.length, 1);
    strictEqual(rootClient.methods[0].name, "a2");
  });

  it("move an operation to root client and omit the original operation group", async () => {
    await runner.compileWithBuiltInService(
      `
    interface A {
      @route("/a")
      @clientLocation(TestService)
      op a(): void;
    }
  `,
    );

    const sdkPackage = runner.context.sdkPackage;
    const rootClient = sdkPackage.clients.find((c) => c.name === "TestServiceClient");
    ok(rootClient);
    strictEqual(rootClient.children, undefined);
    strictEqual(rootClient.methods.length, 1);
    strictEqual(rootClient.methods[0].name, "a");
  });

  it("move an operation to another operation group with api version", async () => {
    await runner.compile(
      `
    @service
    @versioned(Versions)
    namespace TestService;
    enum Versions {
      v1: "v1",
      v2: "v2",
    }

    interface A {
      @route("/a1")
      op a1(@query apiVersion: string): void;

      @route("/a2")
      @clientLocation(B)
      op a2(@query apiVersion: string): void;
    }

    interface B {
      @route("/b")
      op b(@query apiVersion: string): void;
    }
  `,
    );

    const sdkPackage = runner.context.sdkPackage;
    const rootClient = sdkPackage.clients.find((c) => c.name === "TestServiceClient");
    ok(rootClient);
    strictEqual(rootClient.children?.length, 2);
    const bClient = rootClient.children.find((c) => c.name === "B");
    ok(bClient);
    const bClientApiVersionParam = bClient.clientInitialization.parameters.find(
      (p) => p.name === "apiVersion",
    );

    strictEqual(bClient.methods.length, 2);
    const a2Method = bClient.methods.find(
      (m) => m.name === "a2",
    ) as SdkServiceMethod<SdkHttpOperation>;
    ok(a2Method);
    strictEqual(a2Method.parameters.length, 0);
    strictEqual(a2Method.operation.parameters.length, 1);
    strictEqual(a2Method.operation.parameters[0].name, "apiVersion");
    strictEqual(a2Method.operation.parameters[0].correspondingMethodParams.length, 1);
    strictEqual(
      a2Method.operation.parameters[0].correspondingMethodParams[0],
      bClientApiVersionParam,
    );
  });

  it("move an operation to a new opeartion group with api version", async () => {
    await runner.compile(
      `
    @service
    @versioned(Versions)
    namespace TestService;
    enum Versions {
      v1: "v1",
      v2: "v2",
    }

    interface A {
      @route("/a1")
      op a1(@query apiVersion: string): void;

      @route("/a2")
      @clientLocation("B")
      op a2(@query apiVersion: string): void;
    }
  `,
    );

    const sdkPackage = runner.context.sdkPackage;
    const rootClient = sdkPackage.clients.find((c) => c.name === "TestServiceClient");
    ok(rootClient);
    strictEqual(rootClient.children?.length, 2);
    const bClient = rootClient.children.find((c) => c.name === "B");
    ok(bClient);
    const bClientApiVersionParam = bClient.clientInitialization.parameters.find(
      (p) => p.name === "apiVersion",
    );

    strictEqual(bClient.methods.length, 1);
    const a2Method = bClient.methods.find(
      (m) => m.name === "a2",
    ) as SdkServiceMethod<SdkHttpOperation>;
    ok(a2Method);
    strictEqual(a2Method.parameters.length, 0);
    strictEqual(a2Method.operation.parameters.length, 1);
    strictEqual(a2Method.operation.parameters[0].name, "apiVersion");
    strictEqual(a2Method.operation.parameters[0].correspondingMethodParams.length, 1);
    strictEqual(
      a2Method.operation.parameters[0].correspondingMethodParams[0],
      bClientApiVersionParam,
    );
  });

  it("move an operation to root client with api version", async () => {
    await runner.compile(
      `
    @service
    @versioned(Versions)
    namespace TestService;
    enum Versions {
      v1: "v1",
      v2: "v2",
    }

    interface A {
      @route("/a1")
      op a1(@query apiVersion: string): void;

      @route("/a2")
      @clientLocation(TestService)
      op a2(@query apiVersion: string): void;
    }
  `,
    );

    const sdkPackage = runner.context.sdkPackage;
    const rootClient = sdkPackage.clients.find((c) => c.name === "TestServiceClient");
    ok(rootClient);
    const rootClientApiVersionParam = rootClient.clientInitialization.parameters.find(
      (p) => p.name === "apiVersion",
    );

    strictEqual(rootClient.methods.length, 1);
    strictEqual(rootClient.methods[0].name, "a2");
    const a2Method = rootClient.methods.find(
      (m) => m.name === "a2",
    ) as SdkServiceMethod<SdkHttpOperation>;
    ok(a2Method);
    strictEqual(a2Method.parameters.length, 0);
    strictEqual(a2Method.operation.parameters.length, 1);
    strictEqual(a2Method.operation.parameters[0].name, "apiVersion");
    strictEqual(a2Method.operation.parameters[0].correspondingMethodParams.length, 1);
    strictEqual(
      a2Method.operation.parameters[0].correspondingMethodParams[0],
      rootClientApiVersionParam,
    );
  });

  it("all operations have been moved", async () => {
    await runner.compile(
      `
    @service
    @versioned(Versions)
    namespace TestService;
    enum Versions {
      v1: "v1",
      v2: "v2",
    }

    interface A {
      @route("/a1")
      @clientLocation("B")
      op a1(@query apiVersion: string): void;

      @route("/a2")
      @clientLocation("C")
      op a2(@query apiVersion: string): void;
    }
  `,
    );

    const sdkPackage = runner.context.sdkPackage;
    const rootClient = sdkPackage.clients.find((c) => c.name === "TestServiceClient");
    ok(rootClient);
    const rootClientApiVersionParam = rootClient.clientInitialization.parameters.find(
      (p) => p.name === "apiVersion",
    );
    ok(rootClientApiVersionParam);

    strictEqual(rootClient.children?.length, 2);

    const bClient = rootClient.children.find((c) => c.name === "B");
    ok(bClient);
    const bClientApiVersionParam = bClient.clientInitialization.parameters.find(
      (p) => p.name === "apiVersion",
    );
    ok(bClientApiVersionParam);

    const cClient = rootClient.children.find((c) => c.name === "C");
    ok(cClient);
    const cClientApiVersionParam = cClient.clientInitialization.parameters.find(
      (p) => p.name === "apiVersion",
    );
    ok(cClientApiVersionParam);
  });
});

describe("Parameter", () => {
  it("move parameter from operation to client", async () => {
    await runner.compileWithBuiltInService(
      `
      interface A {
        @route("/a")
        op a(@query @clientLocation(TestService) apiKey: string, data: string): void;
      }
      `,
    );

    const sdkPackage = runner.context.sdkPackage;
    const rootClient = sdkPackage.clients.find((c) => c.name === "TestServiceClient");
    ok(rootClient);

    // apiKey should be moved to client initialization
    const clientApiKeyParam = rootClient.clientInitialization.parameters.find(
      (p) => p.name === "apiKey",
    );
    ok(clientApiKeyParam);
    ok(clientApiKeyParam.onClient);

    // Operation should not have apiKey as method parameter
    const aClient = rootClient.children?.find((c) => c.name === "A");
    ok(aClient);
    const aMethod = aClient.methods.find(
      (m) => m.name === "a",
    ) as SdkServiceMethod<SdkHttpOperation>;
    ok(aMethod);

    // Should only have 'data' parameter, not 'apiKey'
    strictEqual(aMethod.parameters.length, 2);
    strictEqual(aMethod.parameters[0].name, "data");
    strictEqual(aMethod.parameters[1].name, "contentType");

    // But the HTTP operation should still reference the client parameter
    const httpApiKeyParam = aMethod.operation.parameters.find((p) => p.name === "apiKey");
    ok(httpApiKeyParam);
    strictEqual(httpApiKeyParam.correspondingMethodParams.length, 1);
    strictEqual(httpApiKeyParam.correspondingMethodParams[0], clientApiKeyParam);
  });

  it("detect parameter name conflict when moving to client", async () => {
    const [_, diagnostics] = await runner.compileAndDiagnoseWithCustomization(
      `
      @service
      namespace MyService;
      model TestParams {
        @query apiKey: string;
      }

      @route("/test")
      op test(...TestParams): void;
      `,
      `
      model MyClientOptions {
        apiKey: string;
      }

      @@clientInitialization(MyService, MyClientOptions);
      @@clientLocation(MyService.TestParams.apiKey, MyService);
      `,
    );
    // not sure why it's showing up twice, there seems to be some compiler stuff going on here
    expectDiagnostics(diagnostics, [
      {
        code: "@azure-tools/typespec-client-generator-core/client-location-conflict",
      },
      {
        code: "@azure-tools/typespec-client-generator-core/client-location-conflict",
      },
    ]);
  });

  it("can not move model properties to string", async () => {
    const [_, diagnostics] = await runner.compileAndDiagnose(
      `
      @service
      namespace MyService;

      op test(@clientLocation("test") param: string): void;
      `,
    );
    expectDiagnostics(diagnostics, [
      {
        code: "@azure-tools/typespec-client-generator-core/client-location-conflict",
      },
    ]);
  });

  it("subId from client to operation", async () => {
    const runnerWithArm = await createSdkTestRunner({
      librariesToAdd: [AzureResourceManagerTestLibrary, AzureCoreTestLibrary, OpenAPITestLibrary],
      autoUsings: ["Azure.ResourceManager", "Azure.Core"],
      emitterName: "@azure-tools/typespec-java",
    });
    await runnerWithArm.compile(
      `
    @armProviderNamespace("My.Service")
    @service(#{ title: "My.Service" })
    @versioned(Versions)
    @armCommonTypesVersion(CommonTypes.Versions.v5)
    namespace My.Service;

    /** Api versions */
    enum Versions {
      /** 2024-04-01-preview api version */
          V2024_04_01_PREVIEW: "2024-04-01-preview",
    }

    @autoRoute
    @action("test")
    op test is ArmProviderActionSync<
      Request = {},
      Response = {},
      Scope = SubscriptionActionScope,
      Parameters = {},
      OptionalRequestBody = true
    >;

    @@clientLocation(CommonTypes.SubscriptionIdParameter.subscriptionId, test);
    `,
    );

    const sdkPackage = runnerWithArm.context.sdkPackage;
    const client = sdkPackage.clients[0];
    ok(client);
    for (const p of client.clientInitialization.parameters) {
      ok(p.onClient);
    }
    // since there's only one operation and the subscription id is moved to the operation, it should not be in the client parameters
    ok(!client.clientInitialization.parameters.some((p) => p.name === "subscriptionId"));
    strictEqual(client.methods.length, 1);
    const testMethod = client.methods.find((m) => m.name === "test");
    ok(testMethod);
    strictEqual(testMethod.parameters.length, 3);
    const subIdMethodParam = testMethod.parameters.find((p) => p.name === "subscriptionId");
    ok(subIdMethodParam);
    ok(testMethod.parameters.some((p) => p.name === "contentType"));
    const testOperation = testMethod.operation;
    ok(testOperation);
    strictEqual(testOperation.parameters.length, 3);
    const subIdOperationParam = testOperation.parameters.find((p) => p.name === "subscriptionId");
    ok(subIdOperationParam);
    strictEqual(subIdOperationParam.correspondingMethodParams.length, 1);
    strictEqual(subIdOperationParam.correspondingMethodParams[0], subIdMethodParam);
    ok(testOperation.parameters.some((p) => p.name === "contentType"));
    ok(testOperation.parameters.some((p) => p.name === "apiVersion"));
  });

  it("subId from client to operation for two methods, stays on client for others", async () => {
    const runnerWithArm = await createSdkTestRunner({
      librariesToAdd: [AzureResourceManagerTestLibrary, AzureCoreTestLibrary, OpenAPITestLibrary],
      autoUsings: ["Azure.ResourceManager", "Azure.Core"],
      emitterName: "@azure-tools/typespec-java",
    });
    await runnerWithArm.compile(
      `
    @armProviderNamespace("My.Service")
    @service(#{ title: "My.Service" })
    @versioned(Versions)
    @armCommonTypesVersion(CommonTypes.Versions.v5)
    namespace My.Service;

    /** Api versions */
    enum Versions {
      /** 2024-04-01-preview api version */
          V2024_04_01_PREVIEW: "2024-04-01-preview",
    }

    @subscriptionResource
    model MyModel is ProxyResource<{}> {
      @key("extendedZoneName")
      @segment("extendedZones")
      @path
      name: string;
    }

    // Since we could not locate to the method parameter subscriptionId, we need to define a base parameter model to work around it.
    model GetBaseParameter is Azure.ResourceManager.Foundations.DefaultBaseParameters<MyModel>{}
    model PutBaseParameter is Azure.ResourceManager.Foundations.DefaultBaseParameters<MyModel>{}

    op get is ArmResourceRead<MyModel, BaseParameters = GetBaseParameter>;
    op put is ArmResourceCreateOrReplaceAsync<MyModel, BaseParameters = PutBaseParameter>;
    op delete is ArmResourceDeleteWithoutOkAsync<MyModel>;

    @@clientLocation(GetBaseParameter.subscriptionId, get);
    @@clientLocation(PutBaseParameter.subscriptionId, put);
    `,
    );

    const sdkPackage = runnerWithArm.context.sdkPackage;
    const client = sdkPackage.clients[0];
    ok(client);
    for (const p of client.clientInitialization.parameters) {
      ok(p.onClient);
    }
    // since there's only one operation and the subscription id is moved to the operation, it should not be in the client parameters
    const subIdClientParam = client.clientInitialization.parameters.find(
      (p) => p.name === "subscriptionId",
    );
    ok(subIdClientParam);
    strictEqual(client.methods.length, 3);

    const getMethod = client.methods.find((m) => m.name === "get");
    ok(getMethod);
    strictEqual(getMethod.parameters.length, 3);
    let subIdMethodParam = getMethod.parameters.find((p) => p.name === "subscriptionId");
    ok(subIdMethodParam);
    ok(getMethod.parameters.some((p) => p.name === "extendedZoneName"));
    ok(getMethod.parameters.some((p) => p.name === "accept"));
    const getOperation = getMethod.operation;
    ok(getOperation);
    strictEqual(getOperation.parameters.length, 4);
    const subIdOperationParam = getOperation.parameters.find((p) => p.name === "subscriptionId");
    ok(subIdOperationParam);
    strictEqual(subIdOperationParam.correspondingMethodParams.length, 1);
    strictEqual(subIdOperationParam.correspondingMethodParams[0], subIdMethodParam);

    const putMethod = client.methods.find((m) => m.name === "put");
    ok(putMethod);
    strictEqual(putMethod.parameters.length, 5);
    subIdMethodParam = putMethod.parameters.find((p) => p.name === "subscriptionId");
    ok(putMethod.parameters.some((p) => p.name === "extendedZoneName"));
    ok(putMethod.parameters.some((p) => p.name === "contentType"));
    ok(putMethod.parameters.some((p) => p.name === "accept"));
    ok(putMethod.parameters.some((p) => p.name === "resource"));
    ok(subIdMethodParam);
    const putOperation = putMethod.operation;
    ok(putOperation);
    strictEqual(putOperation.parameters.length, 5);
    const putSubIdOperationParam = putOperation.parameters.find((p) => p.name === "subscriptionId");
    ok(putSubIdOperationParam);
    strictEqual(putSubIdOperationParam.correspondingMethodParams.length, 1);
    strictEqual(putSubIdOperationParam.correspondingMethodParams[0], subIdMethodParam);

    const deleteMethod = client.methods.find((m) => m.name === "delete");
    ok(deleteMethod);
    strictEqual(deleteMethod.parameters.length, 1);
    // The subscriptionId parameter should not be moved to the operation
    ok(!deleteMethod.parameters.some((p) => p.name === "subscriptionId"));
    const deleteOperation = deleteMethod.operation;
    ok(deleteOperation);
    strictEqual(deleteOperation.parameters.length, 3);
    const deleteSubIdOperationParam = deleteOperation.parameters.find(
      (p) => p.name === "subscriptionId",
    );
    ok(deleteSubIdOperationParam);
    strictEqual(deleteSubIdOperationParam.correspondingMethodParams.length, 1);
    strictEqual(deleteSubIdOperationParam.correspondingMethodParams[0], subIdClientParam);
  });

  it("move to `@clientInitialization` for grandparent client", async () => {
    await runner.compile(
      `
      @service
      namespace Grandparent;

      namespace Parent {
        model Blob {
          id: string;
          name: string;
          size: int32;
          path: string;
        }
        interface Child {
          @route("/blob")
          @get
          getBlob(
            @query
            @global.Azure.ClientGenerator.Core.clientLocation(Grandparent)
            storageAccount: string,

            @query container: string,
            @query blob: string,
          ): Blob;
        }
      }
      `,
    );
    const sdkPackage = runner.context.sdkPackage;
    const grandparentClient = sdkPackage.clients.find((c) => c.name === "GrandparentClient");
    ok(grandparentClient);
    strictEqual(grandparentClient.clientInitialization.parameters.length, 2);
    ok(grandparentClient.clientInitialization.parameters.find((p) => p.name === "endpoint"));
    ok(grandparentClient.clientInitialization.parameters.find((p) => p.name === "storageAccount"));

    const parentClient = grandparentClient.children?.find((c) => c.name === "Parent");
    ok(parentClient);
    strictEqual(parentClient.clientInitialization.parameters.length, 2);
    ok(parentClient.clientInitialization.parameters.find((p) => p.name === "endpoint"));
    ok(parentClient.clientInitialization.parameters.find((p) => p.name === "storageAccount"));

    const childClient = parentClient.children?.find((c) => c.name === "Child");
    ok(childClient);
    strictEqual(childClient.clientInitialization.parameters.length, 2);
    ok(childClient.clientInitialization.parameters.find((p) => p.name === "endpoint"));
    ok(childClient.clientInitialization.parameters.find((p) => p.name === "storageAccount"));

    const method = childClient.methods.find((m) => m.name === "getBlob");
    ok(method);
    strictEqual(method.parameters.length, 3);
    ok(method.parameters.find((p) => p.name === "container"));
    ok(method.parameters.find((p) => p.name === "blob"));
    ok(method.parameters.find((p) => p.name === "accept"));
  });

  it("move to `@clientInitialization` for parent client", async () => {
    await runner.compile(
      `
      @service
      namespace Grandparent;

      namespace Parent {
        model Blob {
          id: string;
          name: string;
          size: int32;
          path: string;
        }
        interface Child {
          @route("/blob")
          @get
          getBlob(
            @query
            @global.Azure.ClientGenerator.Core.clientLocation(Parent)
            storageAccount: string,

            @query container: string,
            @query blob: string,
          ): Blob;
        }
      }
      `,
    );
    const sdkPackage = runner.context.sdkPackage;
    const grandparentClient = sdkPackage.clients.find((c) => c.name === "GrandparentClient");
    ok(grandparentClient);
    strictEqual(grandparentClient.clientInitialization.parameters.length, 1);
    ok(grandparentClient.clientInitialization.parameters.find((p) => p.name === "endpoint"));

    const parentClient = grandparentClient.children?.find((c) => c.name === "Parent");
    ok(parentClient);
    strictEqual(parentClient.clientInitialization.parameters.length, 2);
    ok(parentClient.clientInitialization.parameters.find((p) => p.name === "endpoint"));
    ok(parentClient.clientInitialization.parameters.find((p) => p.name === "storageAccount"));

    const childClient = parentClient.children?.find((c) => c.name === "Child");
    ok(childClient);
    strictEqual(childClient.clientInitialization.parameters.length, 2);
    ok(childClient.clientInitialization.parameters.find((p) => p.name === "endpoint"));
    ok(childClient.clientInitialization.parameters.find((p) => p.name === "storageAccount"));

    const method = childClient.methods.find((m) => m.name === "getBlob");
    ok(method);
    strictEqual(method.parameters.length, 3);
    ok(method.parameters.find((p) => p.name === "container"));
    ok(method.parameters.find((p) => p.name === "blob"));
    ok(method.parameters.find((p) => p.name === "accept"));
  });

  it("with @override", async () => {
    runner = await createSdkTestRunner({
      librariesToAdd: [AzureResourceManagerTestLibrary, AzureCoreTestLibrary, OpenAPITestLibrary],
      autoUsings: ["Azure.ResourceManager", "Azure.Core"],
      emitterName: "@azure-tools/typespec-python",
    });

    await runner.compile(
      `
        @armProviderNamespace
        @service(#{ title: "ContosoProviderHubClient" })
        @versioned(Versions)
        namespace Microsoft.ContosoProviderHub;

        /** Contoso API versions */
        enum Versions {
          /** 2021-10-01-preview version */
          @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
          "2021-10-01-preview",
        }

        /** A ContosoProviderHub resource */
        model Employee is TrackedResource<EmployeeProperties> {
          ...ResourceNameParameter<Employee>;
        }

        /** Employee properties */
        model EmployeeProperties {
          prop: string;
        }

        @armResourceOperations
        interface Employees {
          get is ArmResourceRead<Employee>;
        }

        op employeeGet(
          ...ApiVersionParameter,

          #suppress "@azure-tools/typespec-azure-core/documentation-required" "customization"
          @clientLocation(employeeGet, "java,python,go,javascript")
          subscriptionId: Azure.Core.uuid,

          ...ResourceGroupParameter,
          ...Azure.ResourceManager.ProviderNamespace<Employee>,
          #suppress "@azure-tools/typespec-azure-core/documentation-required" "customization"
          employeeName: string,
        ): Employee;

        @@override(Employees.get, employeeGet);
      `,
    );
    const sdkPackage = runner.context.sdkPackage;
    const client = sdkPackage.clients[0];
    ok(client);

    strictEqual(client.clientInitialization.parameters.length, 3);
    ok(client.clientInitialization.parameters.find((p) => p.name === "endpoint"));
    ok(client.clientInitialization.parameters.find((p) => p.name === "credential"));
    ok(client.clientInitialization.parameters.find((p) => p.name === "apiVersion"));

    const method = client.children?.[0].methods?.[0];
    ok(method);
    strictEqual(method.name, "get");
    strictEqual(method.parameters.length, 4);
    ok(method.parameters.find((p) => p.name === "subscriptionId"));
    ok(method.parameters.find((p) => p.name === "resourceGroupName"));
    ok(method.parameters.find((p) => p.name === "employeeName"));
    ok(method.parameters.find((p) => p.name === "accept"));

    const operation = method.operation;
    ok(operation);
    strictEqual(operation.parameters.length, 5);
    const subIdParam = operation.parameters.find((p) => p.name === "subscriptionId");
    ok(subIdParam);
    const subIdMethodParam = method.parameters.find((p) => p.name === "subscriptionId");
    ok(subIdMethodParam);
    strictEqual(subIdParam.correspondingMethodParams.length, 1);
    strictEqual(subIdParam.correspondingMethodParams[0], subIdMethodParam);
  });

  it("subscriptionId on client when clientLocation moves it to method level for some operations in nested operation groups", async () => {
    const runnerWithArm = await createSdkTestRunner({
      librariesToAdd: [AzureResourceManagerTestLibrary, AzureCoreTestLibrary, OpenAPITestLibrary],
      autoUsings: ["Azure.ResourceManager", "Azure.Core"],
      emitterName: "@azure-tools/typespec-java",
    });
    await runnerWithArm.compile(
      `
      @armProviderNamespace("Microsoft.Contoso")
      @service(#{
        title: "Microsoft.Contoso management service",
      })
      @versioned(Microsoft.Contoso.Versions)
      namespace Microsoft.Contoso;

      /** The available API versions. */
      enum Versions {
        /** 2021-10-01-preview version */
        @armCommonTypesVersion(CommonTypes.Versions.v5)
        v2021_10_01_preview: "2021-10-01-preview",
      }

      /** Employee resource */
      model Employee is TrackedResource<EmployeeProperties> {
        ...ResourceNameParameter<Employee>;
      }

      /** Employee properties */
      model EmployeeProperties {
        /** Age of employee */
        age?: int32;
      }

      model EmployeeBaseParameter
          is Azure.ResourceManager.Foundations.DefaultBaseParameters<Employee>;

      namespace AnotherLayer {
        @armResourceOperations
        interface Employees {
          createOrUpdate is ArmResourceCreateOrReplaceAsync<
            Employee,
            BaseParameters = EmployeeBaseParameter
          >;
          get is ArmResourceRead<Employee>;
        }
      }
      @@clientLocation(EmployeeBaseParameter.subscriptionId, AnotherLayer.Employees.createOrUpdate);
      `,
    );

    const sdkPackage = runnerWithArm.context.sdkPackage;
    const client = sdkPackage.clients[0];
    ok(client);

    // The subscriptionId should exist at the client level because 'get' operation doesn't have clientLocation
    // specified for subscriptionId, so it should remain on the client
    const subIdClientParam = client.clientInitialization.parameters.find(
      (p) => p.name === "subscriptionId",
    );
    ok(subIdClientParam);

    // Check the AnotherLayer operation group
    const anotherLayer = client.children?.find((c) => c.name === "AnotherLayer");
    ok(anotherLayer);

    // The operation group should also have subscriptionId in its parameters
    const subIdNsParam = anotherLayer.clientInitialization.parameters.find(
      (p) => p.name === "subscriptionId",
    );
    ok(subIdNsParam);

    // Check the Employees operation group
    const employees = anotherLayer.children?.find((c) => c.name === "Employees");
    ok(employees);

    // The operation group should also have subscriptionId in its parameters
    const subIdOgParam = employees.clientInitialization.parameters.find(
      (p) => p.name === "subscriptionId",
    );
    ok(subIdOgParam);

    // The createOrUpdate method should have subscriptionId as a method parameter (not client)
    const createOrUpdateMethod = employees.methods.find((m) => m.name === "createOrUpdate");
    ok(createOrUpdateMethod);
    const createOrUpdateSubIdParam = createOrUpdateMethod.parameters.find(
      (p) => p.name === "subscriptionId",
    );
    ok(createOrUpdateSubIdParam);

    // The get method should NOT have subscriptionId as a method parameter (it's on client)
    const getMethod = employees.methods.find((m) => m.name === "get");
    ok(getMethod);
    const getSubIdMethodParam = getMethod.parameters.find((p) => p.name === "subscriptionId");
    ok(!getSubIdMethodParam);

    // But the get operation should reference the client subscriptionId parameter
    const getOperation = getMethod.operation;
    ok(getOperation);
    const getSubIdOpParam = getOperation.parameters.find((p) => p.name === "subscriptionId");
    ok(getSubIdOpParam);
    strictEqual(getSubIdOpParam.methodParameterSegments[0][0], subIdOgParam);
  });
});
