import { Tester } from "#test/tester.js";
import { expectDiagnosticEmpty, expectDiagnostics } from "@typespec/compiler/testing";
import { it } from "vitest";

it("suppresses only the reviewed legacy PUT operation through the registered linter", async () => {
  const path = "/providers/Microsoft.Contoso/widgets";
  const code = `
    @route("${path}")
    @put op create(): void;
  `;
  const compilerOptions = {
    linterRuleSet: {
      enable: { "@azure-tools/typespec-azure-resource-manager/use-resource-path-for-put": true },
    },
  };
  const [, unsuppressed] = await Tester.compileAndDiagnose(code, { compilerOptions });
  expectDiagnostics(unsuppressed, {
    code: "@azure-tools/typespec-azure-resource-manager/use-resource-path-for-put",
    message: `ARM PUT path '${path}' must end in repeated /{resourceType}/{resourceName} or /{resourceType}/default pairs after the provider namespace.`,
  });
  const [, suppressed] = await Tester.compileAndDiagnose(
    `#suppress "@azure-tools/typespec-azure-resource-manager/use-resource-path-for-put" "Reviewed legacy ARM collection PUT contract."
    ${code}`,
    { compilerOptions },
  );
  expectDiagnosticEmpty(suppressed);
});
