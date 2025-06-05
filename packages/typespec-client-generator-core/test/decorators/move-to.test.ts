import { expectDiagnostics } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { SdkHttpOperation, SdkServiceMethod } from "../../src/interfaces.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});

it("@moveTo along with @client", async () => {
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

    @moveTo("Inner")
    op test is MyService.test;
  `,
    )
  )[1];

  expectDiagnostics(diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/move-to-conflict",
  });
});

it("@moveTo along with @operationGroup", async () => {
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
      @moveTo("Inner")
      op test is MyService.test;
    }
  `,
    )
  )[1];

  expectDiagnostics(diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/move-to-conflict",
  });
});

it("move an operation to another operation group", async () => {
  await runner.compileWithBuiltInService(
    `
    interface A {
      @route("/a1")
      op a1(): void;

      @route("/a2")
      @moveTo(B)
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
      @moveTo(B)
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
      @moveTo("B")
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
      @moveTo("B")
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
      @moveTo(TestService)
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
      @moveTo(TestService)
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
      @moveTo(B)
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
      @moveTo("B")
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
      @moveTo(TestService)
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
