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
  it("subId from client to operation", async () => {
  const runnerWithArm = await createSdkTestRunner({
    librariesToAdd: [AzureResourceManagerTestLibrary, AzureCoreTestLibrary, OpenAPITestLibrary],
    autoUsings: ["Azure.ResourceManager", "Azure.Core"],
    emitterName: "@azure-tools/typespec-java",
  });
  await runnerWithArm.compileWithCustomization(
    `
    @armProviderNamespace("My.Service")
    @service(#{title: "My.Service"})
    @versioned(Versions)
    @armCommonTypesVersion(CommonTypes.Versions.v5)
    namespace My.Service;

    /** Api versions */
    enum Versions {
      /** 2024-04-01-preview api version */
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      V2024_04_01_PREVIEW: "2024-04-01-preview",
    }

    @subscriptionResource
    model MyModel is ProxyResource<{}> {
      @key("extendedZoneName")
      @segment("extendedZones")
      @path
      name: string;
    }

    @armResourceOperations
    interface Operations extends Azure.ResourceManager.Operations {
      get is ArmResourceRead<MyModel>;
      put is ArmResourceCreateOrReplaceAsync<MyModel>;
    }

    `,
    `
    @@clientLocation(CommonTypes.SubscriptionIdParameter.subscriptionId, My.Service.Operations.get);
    `,
  );

  const sdkPackage = runnerWithArm.context.sdkPackage;
  const client = sdkPackage.clients[0].children?.[0];
  ok(client);
  for (const p of client.clientInitialization.parameters) {
    ok(p.onClient);
  }
  ok(client.clientInitialization.parameters.some((p) => p.name === "subscriptionId"));
  const myInterface = client.children?.find((c) => c.name === "MyInterface");
  ok(myInterface);
  strictEqual(myInterface.methods.length, 1);
  const getOperation = myInterface.methods.find((m) => m.name === "get");
  ok(getOperation);
  strictEqual(getOperation.parameters.length, 1);

  strictEqual(getOperation.parameters.length, 0);
});
})


