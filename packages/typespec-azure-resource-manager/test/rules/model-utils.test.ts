import { t } from "@typespec/compiler/testing";
import { expect, it } from "vitest";
import { getSingleNonNullMember } from "../../src/rules/model-utils.js";
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
