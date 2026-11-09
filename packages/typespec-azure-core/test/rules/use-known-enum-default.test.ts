import { Tester } from "#test/test-host.js";
import { type LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { useKnownEnumDefaultRule } from "../../src/rules/use-known-enum-default.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    useKnownEnumDefaultRule,
    "@azure-tools/typespec-azure-core",
  );
});

describe("extensible enum defaults", () => {
  it.each([
    [`"cat" | "dog" | string`, `"bird"`],
    [`"cat" | "dog" | string`, `""`],
    [`1 | 2 | int32`, `0`],
    [`1 | 2 | int32`, `-1`],
  ])("warns when %s has an undeclared default %s", async (type, value) => {
    await tester.expect(`model Pet { kind: ${type} = ${value}; }`).toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-core/use-known-enum-default",
      severity: "warning",
      message: "Default value should be one of the declared enum values.",
    });
  });

  it.each([
    [`"cat" | "dog" | string`, `"cat"`],
    [`"" | "cat" | string`, `""`],
    [`0 | 1 | int32`, `0`],
    [`-1 | 1 | int32`, `-1`],
    [`1.5 | 2.5 | float64`, `1.50`],
  ])("accepts a declared default %s = %s", async (type, value) => {
    await tester.expect(`model Pet { kind: ${type} = ${value}; }`).toBeValid();
  });

  it("compares values rather than variant names", async () => {
    await tester
      .expect(
        `
        union PetKind { Cat: "cat", Dog: "dog", string }
        model Pet { kind: PetKind = "Cat"; }
      `,
      )
      .toEmitDiagnostics({ code: "@azure-tools/typespec-azure-core/use-known-enum-default" });
    await tester
      .expect(
        `
        union PetKind { Cat: "cat", Dog: "dog", string }
        model Pet { kind: PetKind = PetKind.Cat; }
      `,
      )
      .toBeValid();
  });

  it("includes values from nested unions and enums", async () => {
    await tester
      .expect(
        `
        enum LegacyKind { Cat: "cat" }
        union KnownKind { LegacyKind, Dog: "dog" }
        union PetKind { KnownKind, string }
        model Pet {
          cat: PetKind = LegacyKind.Cat;
          dog: PetKind = "dog";
        }
      `,
      )
      .toBeValid();
    await tester
      .expect(
        `
        enum LegacyKind { Cat: "cat" }
        union PetKind { LegacyKind, string }
        model Pet { kind: PetKind = "bird"; }
      `,
      )
      .toEmitDiagnostics({ code: "@azure-tools/typespec-azure-core/use-known-enum-default" });
  });

  it.each([
    [
      `union First { Value: "first" } union Second { Value: "second" } union Kind { First, Second, string }`,
      `"first"`,
    ],
    [
      `enum First { Value: "first" } enum Second { Value: "second" } union Kind { First, Second, string }`,
      `"first"`,
    ],
    [`union Known { Value: 1 } union Kind { Known, Value: 2, int32 }`, `1`],
  ])("retains declared defaults when included members reuse names: %s", async (types, value) => {
    await tester.expect(`${types} model Settings { value: Kind = ${value}; }`).toBeValid();
  });

  it("preserves the numeric precision exposed by the compiler", async () => {
    await tester
      .expect(
        `
        union Count { Known: 9007199254740993, int64 }
        model Settings { count: Count = 9007199254740993; }
      `,
      )
      .toBeValid();
    await tester
      .expect(
        `
        union Count { Known: 9007199254740993, int64 }
        model Settings { count: Count = 9007199254740994; }
      `,
      )
      .toEmitDiagnostics({ code: "@azure-tools/typespec-azure-core/use-known-enum-default" });
  });

  it("recognizes numeric values included from enums", async () => {
    await tester
      .expect(
        `
        enum KnownCount { Zero: 0, One: 1 }
        union Count { KnownCount, int32 }
        model Settings {
          literal: Count = 0;
          member: Count = KnownCount.Zero;
        }
      `,
      )
      .toBeValid();
    await tester
      .expect(
        `
        enum KnownCount { Zero: 0, One: 1 }
        union Count { KnownCount, int32 }
        model Settings { count: Count = 2; }
      `,
      )
      .toEmitDiagnostics({ code: "@azure-tools/typespec-azure-core/use-known-enum-default" });
  });

  it("checks operation parameter defaults", async () => {
    await tester
      .expect(`op read(kind: "cat" | "dog" | string = "bird"): void;`)
      .toEmitDiagnostics({ code: "@azure-tools/typespec-azure-core/use-known-enum-default" });
  });
});

describe("other defaults", () => {
  it("does not constrain scalars or unions without declared enum values", async () => {
    await tester
      .expect(
        `
        model Settings {
          name: string = "other";
          count: int32 = 0;
          enabled: boolean = false;
          value: string | int32 = "other";
        }
      `,
      )
      .toBeValid();
  });

  it("accepts omitted defaults and compiler-checked closed enum defaults", async () => {
    await tester
      .expect(
        `
        enum Kind { Cat: "cat", Dog: "dog" }
        model Pet {
          unspecified: "cat" | "dog" | string;
          closedUnion: "cat" | "dog" = "cat";
          closedEnum: Kind = Kind.Cat;
        }
      `,
      )
      .toBeValid();
  });

  it("accepts an explicitly nullable default", async () => {
    await tester.expect(`model Pet { kind: "cat" | "dog" | string | null = null; }`).toBeValid();
  });
});
