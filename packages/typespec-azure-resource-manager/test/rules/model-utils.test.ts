import { resolvePath } from "@typespec/compiler";
import { createTester } from "@typespec/compiler/testing";
import { expect, it } from "vitest";
import { getSingleNonNullMember, walkJsonProperties } from "../../src/rules/model-utils.js";

it("preserves inheritance overrides and encoded JSON names without payload filtering", async () => {
  const { program } = await createTester(resolvePath(import.meta.dirname, "../.."), {
    libraries: [],
  }).compile(`
    model Base { @encodedName("application/json", "baseName") name: string; inherited: string; }
    model Derived extends Base { @encodedName("application/json", "derivedName") name: string; }
    union Nullable { Derived, null }
    union Ambiguous { Derived, Base, null }
    union OnlyNull { null }
  `);
  const namespace = program.getGlobalNamespaceType();
  const model = namespace.models.get("Derived");
  const nullable = namespace.unions.get("Nullable");
  const ambiguous = namespace.unions.get("Ambiguous");
  const onlyNull = namespace.unions.get("OnlyNull");
  if (!model || !nullable || !ambiguous || !onlyNull) throw new Error("Missing compiled types.");
  expect([...walkJsonProperties(program, model)].map(([name]) => name)).toEqual([
    "derivedName",
    "inherited",
  ]);
  expect(getSingleNonNullMember(nullable)).toBe(model);
  expect(getSingleNonNullMember(ambiguous)).toBeUndefined();
  expect(getSingleNonNullMember(onlyNull)).toBeUndefined();
});
