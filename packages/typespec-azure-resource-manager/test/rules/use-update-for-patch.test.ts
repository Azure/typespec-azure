import { Tester } from "#test/tester.js";
import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { readFile } from "node:fs/promises";
import { beforeEach, it } from "vitest";
import { useUpdateForPatchRule } from "../../src/rules/use-update-for-patch.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    useUpdateForPatchRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

const header = "@service namespace Microsoft.Contoso;";

function diagnostic(name: string) {
  return {
    code: "@azure-tools/typespec-azure-resource-manager/use-update-for-patch",
    message: `ARM PATCH operation '${name}' should start with 'update'.`,
  };
}

it.each(["patch", "modify", "create", "patch_Update"])("rejects PATCH name %s", async (name) => {
  await tester
    .expect(`${header} @patch @route("/item") op ${name}(): string;`)
    .toEmitDiagnostics([diagnostic(name)]);
});

it.each(["update", "updateWidget", "UpdateTags"])("accepts update prefix %s", async (name) => {
  await tester.expect(`${header} @patch @route("/item") op ${name}(): string;`).toBeValid();
});

it.each([200, 201, 202, 204])("checks PATCH names for response %s", async (status) => {
  await tester
    .expect(`${header} @patch @route("/item") op modify(): { @statusCode code: ${status}; };`)
    .toEmitDiagnostics([diagnostic("modify")]);
});

it("ignores non-PATCH verbs", async () => {
  await tester.expect(`${header} @get @route("/item") op modify(): string;`).toBeValid();
});

it("does not let an interface name mask the operation prefix", async () => {
  await tester
    .expect(`${header} @route("/item") interface UpdateWidgets { @patch op modify(): string; }`)
    .toEmitDiagnostics([diagnostic("modify")]);
});

it("reports distinct offending operation names without a provider decorator", async () => {
  await tester
    .expect(
      `
      ${header}
      @patch @route("/first") op modifyFirst(): string;
      @patch @route("/second") op modifySecond(): string;
    `,
    )
    .toEmitDiagnostics([diagnostic("modifyFirst"), diagnostic("modifySecond")]);
});

it("validates the exact incorrect documentation example", async () => {
  const source = await readFile(
    new URL("../../src/rules/use-update-for-patch.md", import.meta.url),
    "utf8",
  );
  const snippet = source
    .replace(/\r\n/g, "\n")
    .split("## Incorrect")[1]
    .match(/```tsp\n([\s\S]*?)```/)![1];
  await tester.expect(snippet).toEmitDiagnostics([diagnostic("modify")]);
});

it("validates the exact correct documentation example", async () => {
  const source = await readFile(
    new URL("../../src/rules/use-update-for-patch.md", import.meta.url),
    "utf8",
  );
  const snippet = source
    .replace(/\r\n/g, "\n")
    .split("## Correct")[1]
    .match(/```tsp\n([\s\S]*?)```/)![1];
  await tester.expect(snippet).toBeValid();
});
