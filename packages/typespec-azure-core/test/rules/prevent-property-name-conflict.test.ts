import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { propertyNameRule } from "../../src/rules/property-naming.js";
import { createAzureCoreTestRunner } from "../test-host.js";

describe("typespec-azure-core: property name conflict", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureCoreTestRunner();
    tester = createLinterRuleTester(runner, propertyNameRule, "@azure-tools/typespec-azure-core");
  });

  it("emit warning if property name conflicts with model name", async () => {
    await tester.expect(`model Foo {foo: string}`).toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-core/property-name-conflict",
      message: `Property 'foo' having the same name as its enclosing model will cause problems with C# code generation. Consider renaming the property directly or using the @projectedName decorator to rename the property for C#.`,
    });
  });

  it("is valid if conflict resolved through @projectedName('csharp', ...)", async () => {
    await tester.expect(`model Foo { @projectedName("csharp", "bar") foo: string }`).toBeValid();
  });

  it("is valid if conflict resolved through @projectedName('client', ...)", async () => {
    await tester.expect(`model Foo { @projectedName("client", "bar") foo: string }`).toBeValid();
  });

  it("emit warning if conflict not resolved through @projectedName", async () => {
    await tester
      .expect(`model Foo { @projectedName("python", "bar") foo: string }`)
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/property-name-conflict",
        message: `Property 'foo' having the same name as its enclosing model will cause problems with C# code generation. Consider renaming the property directly or using the @projectedName decorator to rename the property for C#.`,
      });
  });

  it("emit warning if @projectedName('client', ...) introduces conflict", async () => {
    await tester
      .expect(`model Foo { @projectedName("client", "foo") bar: string }`)
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/property-name-conflict",
        message: `Use of @projectedName on property 'bar' results in 'bar' having the same name as its enclosing type in C#. Please use a different @projectedName value.`,
      });
  });

  it("emit warning if @projectedName('csharp', ...) introduces conflict", async () => {
    await tester
      .expect(`model Foo { @projectedName("csharp", "foo") bar: string }`)
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/property-name-conflict",
        message: `Use of @projectedName on property 'bar' results in 'bar' having the same name as its enclosing type in C#. Please use a different @projectedName value.`,
      });
  });

  it("is valid if @projectedName('client', ...) causes conflict but @projectedName('csharp', ...) resolves it", async () => {
    await tester
      .expect(
        `model Foo { @projectedName("client", "foo") @projectedName("csharp", "baz") bar: string }`
      )
      .toBeValid();
  });

  it("emit warning if @friendlyName would resolve a conflict (friendlyName is ignored)", async () => {
    await tester.expect(`model Foo { @friendlyName("bar") foo: string }`).toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-core/property-name-conflict",
      message: `Property 'foo' having the same name as its enclosing model will cause problems with C# code generation. Consider renaming the property directly or using the @projectedName decorator to rename the property for C#.`,
    });
  });

  it("is valid if @friendlyName introduces conflict (friendlyName is ignored)", async () => {
    await tester.expect(`model Foo { @friendlyName("foo") bar: string }`).toBeValid();
  });

  it("emit warning if property name conflicts with model name when using `is`", async () => {
    await tester
      .expect(
        `
      model Base {
        foo: string
      }

      model Foo is Base {}
      `
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/property-name-conflict",
        message: `Property 'foo' having the same name as its enclosing model will cause problems with C# code generation. Consider renaming the property directly or using the @projectedName decorator to rename the property for C#.`,
      });
  });

  it("is valid if inherited property name conflicts with model name", async () => {
    await tester
      .expect(
        `
      model Base {
        foo: string
      }

      model Foo extends Base {}
      `
      )
      .toBeValid();
  });

  it("emit warning if spread property name conflicts with model name", async () => {
    await tester
      .expect(
        `
      model Base {
        foo: string
      }

      model Foo {
        ...Base;
      }
      `
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/property-name-conflict",
        message: `Property 'foo' having the same name as its enclosing model will cause problems with C# code generation. Consider renaming the property directly or using the @projectedName decorator to rename the property for C#.`,
      });
  });
});
