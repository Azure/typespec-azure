import { Tester } from "#test/tester.js";
import { getSourceLocation } from "@typespec/compiler";
import { expectDiagnostics } from "@typespec/compiler/testing";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { lroMissingPollingMetadataRule } from "../../src/rules/lro-missing-polling-metadata.js";

const code = "@azure-tools/typespec-azure-resource-manager/lro-missing-polling-metadata";
const header = `
  @armProviderNamespace
  @service
  @versioned(Versions)
  namespace Microsoft.TestService;
  enum Versions {
    @useDependency(Azure.ResourceManager.CommonTypes.Versions.v5)
    @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v3)
    v2024_01_01: "2024-01-01",
  }
  interface Operations extends Azure.ResourceManager.Operations {}
`;

function example(section: "Incorrect" | "Correct"): string {
  const markdown = readFileSync(
    new URL("../../src/rules/lro-missing-polling-metadata.md", import.meta.url),
    "utf8",
  );
  const sections = markdown
    .split(/^##[ \t]+/m)
    .filter((text) => new RegExp(`\\b${section}\\b`, "i").test(text.split(/\r?\n/, 1)[0]));
  expect(sections, `one ${section} documentation section`).toHaveLength(1);
  const snippets = [...sections[0].matchAll(/^```typespec[ \t]*\r?\n([\s\S]*?)^```[ \t]*\r?$/gm)];
  expect(snippets, `one TypeSpec example in ${section}`).toHaveLength(1);
  return snippets[0][1];
}

it("compiles the authored incorrect example and targets its declared Location property", async () => {
  const [{ program }, diagnostics] = await Tester.compileAndDiagnose(
    `${header}${example("Incorrect")}`,
    { compilerOptions: { linterRuleSet: { enable: { [code]: true } } } },
  );
  const [response, resolutionDiagnostics] = program.resolveTypeReference(
    "Microsoft.TestService.Response",
  );
  expectDiagnostics(resolutionDiagnostics, []);
  if (response?.kind !== "Model") throw new Error("Expected the authored Response model.");
  const location = response.properties.get("location");
  if (!location) throw new Error("Expected the authored Location header property.");
  const source = getSourceLocation(location);
  expectDiagnostics(diagnostics, [
    {
      code,
      severity: "warning",
      message: lroMissingPollingMetadataRule.messages.default,
      file: source.file.path,
      pos: source.pos,
      end: source.end,
    },
  ]);
});

it("compiles the authored correct example without polling-metadata diagnostics", async () => {
  const [, diagnostics] = await Tester.compileAndDiagnose(`${header}${example("Correct")}`, {
    compilerOptions: { linterRuleSet: { enable: { [code]: true } } },
  });
  expectDiagnostics(diagnostics, []);
});
