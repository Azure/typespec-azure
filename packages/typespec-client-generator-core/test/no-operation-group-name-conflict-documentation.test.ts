import { createLinterRuleTester } from "@typespec/compiler/testing";
import { readFile } from "node:fs/promises";
import { it } from "vitest";
import { noOperationGroupNameConflictRule } from "../src/rules/no-operation-group-name-conflict.rule.js";
import { SimpleBaseTester } from "./tester.js";

it.each([
  ["Incorrect", true],
  ["Correct", false],
] as const)("validates the published %s example", async (heading, invalid) => {
  const documentation = await readFile(
    new URL("../src/rules/no-operation-group-name-conflict.md", import.meta.url),
    "utf8",
  );
  const section = documentation
    .replaceAll("\r\n", "\n")
    .split(`### ${heading}\n`)[1]
    ?.split(/\n##+ /)[0];
  const snippet = section?.match(/```(?:tsp|typespec)\r?\n([\s\S]*?)```/)?.[1];
  if (snippet === undefined) throw new Error(`Missing ${heading} TypeSpec example`);
  const tester = createLinterRuleTester(
    await SimpleBaseTester.import(
      "@typespec/http",
      "@typespec/rest",
      "@typespec/versioning",
      "@azure-tools/typespec-client-generator-core",
    ).createInstance(),
    noOperationGroupNameConflictRule,
    "@azure-tools/typespec-client-generator-core",
  );
  if (invalid) {
    await tester.expect(snippet).toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/no-operation-group-name-conflict",
      message:
        "Operation group 'Widget' conflicts with type 'Widget'. Rename the group, for example by using a plural name.",
    });
  } else {
    await tester.expect(snippet).toBeValid();
  }
});
