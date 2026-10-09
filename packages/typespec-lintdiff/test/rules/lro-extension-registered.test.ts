import { resolvePath } from "@typespec/compiler";
import { createTester } from "@typespec/compiler/testing";
import { expect, it } from "vitest";

const Tester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: [
    "@typespec/http",
    "@typespec/openapi",
    "@typespec/rest",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
    "tsp-lintdiff-local-linter",
  ],
})
  .importLibraries()
  .using("TypeSpec.Http", "TypeSpec.Rest", "TypeSpec.Versioning", "Azure.ResourceManager");

it("resolves a compliant operation once before reporting Core diagnostics across overlapping services", async () => {
  const diagnostics = await Tester.diagnose(
    `
      @armProviderNamespace
      @service
      @versioned(Versions)
      namespace Microsoft.Parent;
      enum Versions {
        @useDependency(Azure.ResourceManager.CommonTypes.Versions.v5)
        @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v3)
        v2024_01_01: "2024-01-01",
      }
      @route("/parent")
      interface Operations extends Azure.ResourceManager.Operations {}

      @armProviderNamespace("Microsoft.Nested")
      @service
      @versioned(Versions)
      namespace Nested {
        @route("/child")
        interface Operations extends Azure.ResourceManager.Operations {}
        @armResourceOperations
        interface ProviderOperations {
          @Azure.Core.useFinalStateVia("original-uri")
          startProvider is ArmProviderActionAsync<Request = void, Response = void>;
        }
      }
    `,
    {
      compilerOptions: {
        linterRuleSet: {
          enable: { "tsp-lintdiff-local-linter/lro-extension": true },
        },
      },
    },
  );

  expect(
    diagnostics.filter(
      (diagnostic) =>
        diagnostic.code === "@azure-tools/typespec-azure-core/no-operation-at-original-uri",
    ),
  ).toHaveLength(1);
  expect(
    diagnostics.filter(
      (diagnostic) => diagnostic.code === "tsp-lintdiff-local-linter/lro-extension",
    ),
  ).toHaveLength(0);
  expect(diagnostics).toHaveLength(1);
});
