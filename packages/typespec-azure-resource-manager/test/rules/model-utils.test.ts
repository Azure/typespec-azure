import { t } from "@typespec/compiler/testing";
import { expect, it } from "vitest";
import { getSingleNonNullMember, walkJsonProperties } from "../../src/rules/model-utils.js";
import { CompilerTester } from "../tester.js";

it("selects only an unambiguous non-null union member", async () => {
  const { Item, Nullable, Ambiguous, OnlyNull } = await CompilerTester.compile(t.code`
    model ${t.model("Item")} { name: string; }
    union ${t.union("Nullable")} { Item, null }
    union ${t.union("Ambiguous")} { Item, string, null }
    union ${t.union("OnlyNull")} { null }
  `);
  expect(getSingleNonNullMember(Nullable)).toBe(Item);
  expect(getSingleNonNullMember(Ambiguous)).toBeUndefined();
  expect(getSingleNonNullMember(OnlyNull)).toBeUndefined();
});

it("preserves inheritance overrides and encoded JSON names without payload filtering", async () => {
  const {
    program,
    Derived: model,
    Nullable: nullable,
    Ambiguous: ambiguous,
    OnlyNull: onlyNull,
  } = await CompilerTester.compile(t.code`
    model Base { @encodedName("application/json", "baseName") name: string; inherited: string; }
    model ${t.model("Derived")} extends Base { @encodedName("application/json", "derivedName") name: string; }
    union ${t.union("Nullable")} { Derived, null }
    union ${t.union("Ambiguous")} { Derived, Base, null }
    union ${t.union("OnlyNull")} { null }
  `);
  expect([...walkJsonProperties(program, model)].map(([name]) => name)).toEqual([
    "derivedName",
    "inherited",
  ]);
  expect(getSingleNonNullMember(nullable)).toBe(model);
  expect(getSingleNonNullMember(ambiguous)).toBeUndefined();
  expect(getSingleNonNullMember(onlyNull)).toBeUndefined();
});
