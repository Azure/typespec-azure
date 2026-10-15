import { createLinterRuleTester } from "@typespec/compiler/testing";
import { readFile } from "node:fs/promises";
import { it } from "vitest";
import { resourceMissingReadRule } from "../../src/rules/resource-missing-read.js";
import { Tester } from "../tester.js";

it.each([
  ["❌ Incorrect", true],
  ["✅ Correct", false],
] as const)("compiles the published %s resource example", async (heading, violates) => {
  const documentation = await readFile(
    new URL("../../src/rules/resource-missing-read.md", import.meta.url),
    "utf8",
  );
  const section = documentation
    .split(/^## /m)
    .find((text) => text.split(/\r?\n/, 1)[0] === heading);
  const snippet = section?.match(/```typespec\r?\n([\s\S]*?)```/)?.[1];
  if (!snippet) throw new Error(`Missing resource-missing-read example in ${heading}.`);
  const tester = createLinterRuleTester(
    await Tester.createInstance(),
    resourceMissingReadRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
  const fixture = tester.expect(`
    @armProviderNamespace @service namespace Microsoft.Contoso;
    model WidgetProperties { label?: string; }
    model Widget is TrackedResource<WidgetProperties> {
      ...ResourceNameParameter<Widget>;
    }
    ${snippet}
  `);
  if (violates) {
    await fixture.toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/resource-missing-read",
      message: "Resource 'Widget' must have a get/read operation.",
    });
  } else {
    await fixture.toBeValid();
  }
});
