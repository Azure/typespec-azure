import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { propertyNameConflictRule } from "../../src/rules/property-name-conflict.rule.js";
import { createSdkTestRunner } from "../test-host.js";

let runner: BasicTestRunner;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await createSdkTestRunner();
  tester = createLinterRuleTester(
    runner,
    propertyNameConflictRule,
    "@azure-tools/typespec-client-generator-core",
  );
});

it("emit warning if property name conflicts with model name", async () => {
  await tester.expect(`model Foo {foo: string}`).toEmitDiagnostics({
    code: "@azure-tools/typespec-client-generator-core/property-name-conflict",
    message: `Property 'foo' having the same name as its enclosing model will cause problems with C# code generation. Consider renaming the property directly or using the @clientName("newName", "csharp") decorator to rename the property for C#.`,
  });
});

it(`is valid if conflict resolved through @clientName("newName", "csharp")`, async () => {
  await tester
    .expect(
      `model Foo { 
        @clientName("bar", "csharp") foo: string
       }`,
    )
    .toBeValid();
});

it(`is valid if conflict resolved through @clientName("newName")`, async () => {
  await tester
    .expect(
      `model Foo { 
        @clientName("bar") foo: string
      }`,
    )
    .toBeValid();
});

it("emit warning if conflict not resolved through @clientName", async () => {
  await tester
    .expect(
      `model Foo { 
        @clientName("bar", "python") foo: string 
      }`,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/property-name-conflict",
      message: `Property 'foo' having the same name as its enclosing model will cause problems with C# code generation. Consider renaming the property directly or using the @clientName("newName", "csharp") decorator to rename the property for C#.`,
    });
});

it(`emit warning if @clientName("newName") introduces conflict`, async () => {
  await tester
    .expect(
      `model Foo { 
        @clientName("foo") bar: string;
       }`,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/property-name-conflict",
      message: `Property 'foo' having the same name as its enclosing model will cause problems with C# code generation. Consider renaming the property directly or using the @clientName("newName", "csharp") decorator to rename the property for C#.`
    });
});

it(`emit warning if @clientName("newName", "csharp") introduces conflict`, async () => {
  await tester
    .expect(
      `model Foo { 
        @clientName("foo", "csharp") bar: string;
      }`,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/property-name-conflict",
      message: `Property 'foo' having the same name as its enclosing model will cause problems with C# code generation. Consider renaming the property directly or using the @clientName("newName", "csharp") decorator to rename the property for C#.`
    });
});

it(`is valid if @clientName("newName") causes conflict but @clientName("newName", "csharp") resolves it`, async () => {
  await tester
    .expect(
      `model Foo {
          @clientName("baz", "csharp") @clientName("foo") bar: string;
        }`,
    )
    .toBeValid();
});

it("emit warning if property name conflicts with model name when using `is`", async () => {
  await tester
    .expect(
      `
      model Base {
        foo: string
      }

      model Foo is Base {}
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/property-name-conflict",
      message: `Property 'foo' having the same name as its enclosing model will cause problems with C# code generation. Consider renaming the property directly or using the @clientName("newName", "csharp") decorator to rename the property for C#.`,
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
      `,
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
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/property-name-conflict",
      message: `Property 'foo' having the same name as its enclosing model will cause problems with C# code generation. Consider renaming the property directly or using the @clientName("newName", "csharp") decorator to rename the property for C#.`,
    });
});
