import { getSourceLocation } from "@typespec/compiler";
import { createLinterRuleTester } from "@typespec/compiler/testing";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { lroMissingPollingMetadataRule } from "../../src/rules/lro-missing-polling-metadata.js";
import { Tester } from "../tester.js";

const documentation = readFileSync(
  new URL("../../src/rules/lro-missing-polling-metadata.md", import.meta.url),
  "utf8",
).replace(/\r\n/g, "\n");

it.each([
  ["incorrect", /LroHeaders\s*=\s*PlainLocationHeaders/, true],
  ["correct", /LroHeaders\s*=\s*ArmLroLocationHeader</, false],
] as const)("compiles the published %s PATCH example", async (_name, customization, violates) => {
  const example = Array.from(
    documentation.matchAll(/```tsp\n([\s\S]*?)\n```/g),
    (match) => match[1],
  ).find((code) => /update\s+is\s+ArmCustomPatchAsync</.test(code) && customization.test(code));
  expect(example, "published ArmCustomPatchAsync customization").toBeDefined();
  const tester = createLinterRuleTester(
    await Tester.createInstance(),
    lroMissingPollingMetadataRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
  const fixture = tester.expect(example!.replace(/update\s+is/, "/*target*/update is"));
  if (violates) {
    await fixture.toEmitDiagnostics(({ target }) => ({
      code: "@azure-tools/typespec-azure-resource-manager/lro-missing-polling-metadata",
      message: lroMissingPollingMetadataRule.messages.default,
      pos: getSourceLocation(target).pos,
      end: getSourceLocation(target).end,
    }));
  } else {
    await fixture.toBeValid();
  }
});
