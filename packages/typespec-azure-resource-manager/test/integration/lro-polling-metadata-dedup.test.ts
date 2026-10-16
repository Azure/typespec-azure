import { expectDiagnostics } from "@typespec/compiler/testing";
import { it } from "vitest";
import { Tester } from "../tester.js";

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
          enable: {
            "@azure-tools/typespec-azure-resource-manager/lro-missing-polling-metadata": true,
          },
        },
      },
    },
  );
  expectDiagnostics(diagnostics, {
    code: "@azure-tools/typespec-azure-core/no-operation-at-original-uri",
  });
});
