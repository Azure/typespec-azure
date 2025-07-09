import {
  createTestRunner,
  expectDiagnosticEmpty,
  expectDiagnostics,
} from "@typespec/compiler/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { describe, it } from "vitest";
import { UnionEnumVariant } from "../../src/helpers/union-enums.js";
import { getUnionAsEnum } from "../../src/index.js";

describe("azure-core: helpers: getUnionAsEnum", () => {
  async function testUnionAsEnum(code: string) {
    const runner = await createTestRunner();
    const { target } = await runner.compile(code);

    strictEqual(target.kind, "Union");

    return getUnionAsEnum(target);
  }
  async function testValidUnionAsEnum(code: string) {
    const [e, diagnostics] = await testUnionAsEnum(code);
    expectDiagnosticEmpty(diagnostics);
    ok(e);
    return e;
  }

  function getMemberValues(members: Map<string | symbol, UnionEnumVariant<any>>) {
    return [...members.values()].map((x) => x.value);
  }

  it("resolve a string enum if all variants are string literals", async () => {
    const res = await testValidUnionAsEnum(`@test("target") union Test {"one" , "two"}`);
    deepStrictEqual(getMemberValues(res.members), ["one", "two"]);
    deepStrictEqual(getMemberValues(res.flattenedMembers), ["one", "two"]);
    strictEqual(res.open, false);
  });

  it("resolve a number enum if all variants are numeric literals", async () => {
    const res = await testValidUnionAsEnum(`@test("target") union Test {0, 1, 2}`);
    deepStrictEqual(getMemberValues(res.members), [0, 1, 2]);
    deepStrictEqual(getMemberValues(res.flattenedMembers), [0, 1, 2]);
    strictEqual(res.open, false);
  });

  it("resolve a open string enum if include string scalar", async () => {
    const res = await testValidUnionAsEnum(`@test("target") union Test {"one" , "two", string}`);
    deepStrictEqual(getMemberValues(res.members), ["one", "two"]);
    deepStrictEqual(getMemberValues(res.flattenedMembers), ["one", "two"]);
    strictEqual(res.open, true);
  });

  it("resolve a open string enum if sub union include string scalar", async () => {
    const res = await testValidUnionAsEnum(`
      @test("target") 
      union Test {"one" , "two", Other }
      union Other { "three", string }
    `);
    strictEqual(res.open, true);
  });

  it("resolve as nullabe if include null", async () => {
    const res = await testValidUnionAsEnum(` @test("target") union Test {"one" , "two", null }`);
    strictEqual(res.nullable, true);
  });

  it("resolve as nullabe if sub union include null", async () => {
    const res = await testValidUnionAsEnum(`
      @test("target") 
      union Test {"one" , "two", Other }
      union Other { "three", null} 
    `);
    strictEqual(res.nullable, true);
  });

  it("resolve a open number enum if include int32 scalar", async () => {
    const res = await testValidUnionAsEnum(`@test("target") union Test {0, 1, 2, int32}`);
    deepStrictEqual(getMemberValues(res.members), [0, 1, 2]);
    deepStrictEqual(getMemberValues(res.flattenedMembers), [0, 1, 2]);
    strictEqual(res.open, true);
  });

  it("flattendMembers include all members from included unions", async () => {
    const res = await testValidUnionAsEnum(
      `
      @test("target")  union Test { UpDown, "left", "right"} 
      union UpDown { "up", "down" }
      `,
    );
    deepStrictEqual(getMemberValues(res.members), ["left", "right"]);
    deepStrictEqual(getMemberValues(res.flattenedMembers), ["up", "down", "left", "right"]);
  });

  it("flattendMembers include all members from included enums", async () => {
    const res = await testValidUnionAsEnum(
      `
      @test("target")  union Test { UpDown, "left", "right"} 
      enum UpDown { up, down }
      `,
    );
    deepStrictEqual(getMemberValues(res.members), ["left", "right"]);
    deepStrictEqual(getMemberValues(res.flattenedMembers), ["up", "down", "left", "right"]);
  });

  it("returns undefined with diagnostic if contains different types", async () => {
    const [res, diagnostics] = await testUnionAsEnum(`@test("target")  union Test { "one", 2}`);
    strictEqual(res, undefined);
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-azure-core/union-enums-multiple-kind",
      message: "Couldn't resolve the kind of the union as it has multiple types: string, number",
    });
  });

  it("returns undefined with diagnostic if contains non enum types", async () => {
    const [res, diagnostics] = await testUnionAsEnum(
      `
      @test("target")  union Test { Mod, "one"} 
      model Mod {}
      `,
    );
    strictEqual(res, undefined);
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-azure-core/union-enums-invalid-kind",
      message: "Kind Model prevents this union from being resolved as an enum.",
    });
  });

  it("returns undefined with diagnostic if union reference itself", async () => {
    const [res, diagnostics] = await testUnionAsEnum(
      `
      @test("target") union Test { Test, "one"} 
      `,
    );
    strictEqual(res, undefined);
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-azure-core/union-enums-circular",
      message: "Union is referencing itself and cannot be resolved as an enum.",
    });
  });

  it("should not inherit nullable from sub-unions that are not actually nullable", async () => {
    // This test reproduces the issue from the playground where 
    // union MessageAttachmentToolDefinit { {} | {} } was incorrectly marked as nullable
    const [res, diagnostics] = await testUnionAsEnum(
      `
      union SubUnion { {}, {} }
      @test("target") union Test { SubUnion }
      `,
    );
    // Should produce diagnostics because models cannot be enums (2 for the 2 models in SubUnion)
    expectDiagnostics(diagnostics, [
      {
        code: "@azure-tools/typespec-azure-core/union-enums-invalid-kind",
        message: "Kind Model prevents this union from being resolved as an enum.",
      },
      {
        code: "@azure-tools/typespec-azure-core/union-enums-invalid-kind",
        message: "Kind Model prevents this union from being resolved as an enum.",
      }
    ]);
    strictEqual(res, undefined); // Should return undefined because it contains non-enum types
    
    // Let's also test the specific playground case with empty models
    const [res2, diagnostics2] = await testUnionAsEnum(
      `
      @test("target") union MessageAttachmentToolDefinit { {} | {} }
      `,
    );
    expectDiagnostics(diagnostics2, [
      {
        code: "@azure-tools/typespec-azure-core/union-enums-invalid-kind",
        message: "Kind Model prevents this union from being resolved as an enum.",
      },
      {
        code: "@azure-tools/typespec-azure-core/union-enums-invalid-kind",
        message: "Kind Model prevents this union from being resolved as an enum.",
      }
    ]);
    strictEqual(res2, undefined); // Should return undefined because models are not enum-like
  });

  it("debug playground union structure", async () => {
    // Debug the exact playground structure to understand the issue
    const runner = await createTestRunner();
    const { target } = await runner.compile(`
      @test("target") union MessageAttachmentToolDefinit { {} | {} }
    `);

    strictEqual(target.kind, "Union");
    // Check if the union has the expected structure
    strictEqual(target.variants.size, 1); // Should have 1 variant which is a sub-union
    
    const firstVariant = [...target.variants.values()][0];
    // The first variant should itself be a union of two empty models
    strictEqual(firstVariant.type.kind, "Union");
    strictEqual(firstVariant.type.variants.size, 2); // Two empty models {} | {}
  });
});
