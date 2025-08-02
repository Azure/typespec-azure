import { Model, Operation } from "@typespec/compiler";
import { expectDiagnostics } from "@typespec/compiler/testing";
import { beforeEach, it, expect } from "vitest";
import { getClientNameOverride } from "../../src/decorators.js";
import { createSdkTestRunner, SdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});

it("@featureLifecycle tags the operation as experimental", async () => {
  await runner.compile(
    `
    @service
    namespace TestService;

    @featureLifecycle(FeatureLifecycle.Experimental)
    op foo(): void;
  `,
  );

  const sdkPackage = runner.context.sdkPackage;
  const rootClient = sdkPackage.clients.find((c) => c.name === "TestServiceClient");
  expect(rootClient).toBeDefined();
  expect(rootClient?.methods.length).toBe(1);
  const foo = rootClient!.methods[0];
  expect(foo.featureLifecycle).toBe("Experimental");
});

it("@featureLifecycle should not tag the operation as experimental when not in scope", async () => {
  await runner.compile(
    `
    @service
    namespace TestService;

    @featureLifecycle(FeatureLifecycle.Experimental, "notMyEmitter")
    op foo(): void;
  `,
  );

  const sdkPackage = runner.context.sdkPackage;
  const rootClient = sdkPackage.clients.find((c) => c.name === "TestServiceClient");
  expect(rootClient).toBeDefined();
  expect(rootClient?.methods.length).toBe(1);
  const foo = rootClient!.methods[0];
  expect(foo.featureLifecycle).toBeUndefined();
});


it("@featureLifecycle should tag the operation as experimental when in scope", async () => {
  await runner.compile(
    `
    @service
    namespace TestService;

    @featureLifecycle(FeatureLifecycle.Experimental, "python")
    op foo(): void;
  `,
  );

  const sdkPackage = runner.context.sdkPackage;
  const rootClient = sdkPackage.clients.find((c) => c.name === "TestServiceClient");
  expect(rootClient).toBeDefined();
  expect(rootClient?.methods.length).toBe(1);
  const foo = rootClient!.methods[0];
  expect(foo.featureLifecycle).toBe("Experimental")
});



it("@featureLifecycle tags the model as experimental", async () => {
  await runner.compile(
    `
    @service
    namespace TestService;

    @featureLifecycle(FeatureLifecycle.Experimental)
    model Foo {
      name: string;
      foo: string;
    }

    op foo(...Foo): void;
  `,
  );

  const sdkPackage = runner.context.sdkPackage;
  const fooModel = sdkPackage.models.find((c) => c.name === "Foo");
  expect(fooModel).toBeDefined();
  expect(fooModel!.featureLifecycle).toBe("Experimental");
});


it("@featureLifecycle tags the model property as experimental", async () => {
  await runner.compile(
    `
    @service
    namespace TestService;

    model Foo {
      name: string;
      @featureLifecycle(FeatureLifecycle.Experimental)
      foo: string;
    }
  `,
  );

  const sdkPackage = runner.context.sdkPackage;
  const fooModel = sdkPackage.models.find((c) => c.name === "Foo");
  expect(fooModel).toBeDefined();
  expect(fooModel!.featureLifecycle).toBeUndefined();
  const fooProperty = fooModel!.properties.find((p) => p.name === "foo");
  expect(fooProperty).toBeDefined();
  expect(fooProperty!.featureLifecycle).toBe("Experimental")
});
