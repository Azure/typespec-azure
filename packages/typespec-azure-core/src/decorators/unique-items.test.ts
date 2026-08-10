import { Tester } from "#test/test-host.js";
import { expectDiagnostics, t } from "@typespec/compiler/testing";
import assert from "assert";
import { it } from "vitest";
import { hasUniqueItems } from "../decorators.js";

it("correctly detects uniqueItems on an array type property", async () => {
  const { bar, program } = await Tester.compile(t.code`
    model Foo {
      @uniqueItems
      @test ${t.modelProperty("bar")}: string[];
    }
  `);

  const unique = hasUniqueItems(program, bar);
  assert.deepStrictEqual(unique, true);
});
it("correctly detects uniqueItems on an array type model", async () => {
  const { bar, program } = await Tester.compile(t.code`
    @uniqueItems
    model MyArray is Array<string>;
    model Foo {
      @test ${t.modelProperty("bar")}: MyArray;
    }
  `);

  const unique = hasUniqueItems(program, bar);
  assert.deepStrictEqual(unique, true);
});
it("correctly detects uniqueItems on an Array<T> typed model property", async () => {
  const { bar, program } = await Tester.compile(t.code`
    model Foo {
    @uniqueItems
      @test ${t.modelProperty("bar")}: Array<string>;
    }
  `);

  const unique = hasUniqueItems(program, bar);
  assert.deepStrictEqual(unique, true);
});
it("emits diagnostic when @uniqueItems decorates a non-array model property", async () => {
  const diagnostics = await Tester.diagnose(`
    model Foo {
      @uniqueItems
      bar: string;
    }
  `);

  expectDiagnostics(diagnostics, [
    {
      code: "@azure-tools/typespec-azure-core/unique-items-invalid-type",
      message: "@uniqueItems can only be applied to arrays and array-valued model properties.",
    },
  ]);
});
it("emits diagnostic when @uniqueItems decorates a non-array model", async () => {
  const diagnostics = await Tester.diagnose(`
    @uniqueItems
    model Foo {
      bar: string;
    }
  `);

  expectDiagnostics(diagnostics, [
    {
      code: "@azure-tools/typespec-azure-core/unique-items-invalid-type",
      message: "@uniqueItems can only be applied to arrays and array-valued model properties.",
    },
  ]);
});
