import { expectDiagnostics } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { beforeEach, it } from "vitest";
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
    code: "@azure-tools/typespec-client-generator-core/no-move-to-with-client-or-operation-group",
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
    code: "@azure-tools/typespec-client-generator-core/no-move-to-with-client-or-operation-group",
  });
});

it("move an operation to another operation group", async () => {
  await runner.compile(
    `
    @service
    namespace MyService;

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
  const rootClient = sdkPackage.clients.find((c) => c.name === "MyServiceClient");
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
  await runner.compile(
    `
    @service
    namespace MyService;

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
  const rootClient = sdkPackage.clients.find((c) => c.name === "MyServiceClient");
  ok(rootClient);
  strictEqual(rootClient.children?.length, 1);
  const bClient = rootClient.children.find((c) => c.name === "B");
  ok(bClient);
  strictEqual(bClient.methods.length, 2);
  strictEqual(bClient.methods[0].name, "b");
  strictEqual(bClient.methods[1].name, "a");
});

it("move an operation to a new opeartion group", async () => {
  await runner.compile(
    `
    @service
    namespace MyService;

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
  const rootClient = sdkPackage.clients.find((c) => c.name === "MyServiceClient");
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
  await runner.compile(
    `
    @service
    namespace MyService;

    interface A {
      @route("/a")
      @moveTo("B")
      op a(): void;
    }
  `,
  );

  const sdkPackage = runner.context.sdkPackage;
  const rootClient = sdkPackage.clients.find((c) => c.name === "MyServiceClient");
  ok(rootClient);
  strictEqual(rootClient.children?.length, 1);
  const bClient = rootClient.children.find((c) => c.name === "B");
  ok(bClient);
  strictEqual(bClient.methods.length, 1);
  strictEqual(bClient.methods[0].name, "a");
});

it("move an operation to root client", async () => {
  await runner.compile(
    `
    @service
    namespace MyService;

    interface A {
      @route("/a1")
      op a1(): void;

      @route("/a2")
      @moveTo(MyService)
      op a2(): void;
    }
  `,
  );

  const sdkPackage = runner.context.sdkPackage;
  const rootClient = sdkPackage.clients.find((c) => c.name === "MyServiceClient");
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
  await runner.compile(
    `
    @service
    namespace MyService;

    interface A {
      @route("/a")
      @moveTo(MyService)
      op a(): void;
    }
  `,
  );

  const sdkPackage = runner.context.sdkPackage;
  const rootClient = sdkPackage.clients.find((c) => c.name === "MyServiceClient");
  ok(rootClient);
  strictEqual(rootClient.children, undefined);
  strictEqual(rootClient.methods.length, 1);
  strictEqual(rootClient.methods[0].name, "a");
});
