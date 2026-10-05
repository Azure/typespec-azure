import { expectDiagnosticEmpty, expectDiagnostics, t } from "@typespec/compiler/testing";
import { describe, expect, it } from "vitest";
import { getFeatureOptions, getResourceFeatureSet } from "../src/resource.js";
import { Tester } from "./tester.js";

describe("@featureFileOptions version", () => {
  it.each(["", "   "])("rejects an empty or whitespace-only version %j", async (version) => {
    const diagnostics = await Tester.diagnose(`
      @Azure.ResourceManager.featureFiles(Features)
      @armProviderNamespace("Microsoft.Test")
      namespace Microsoft.Test;

      enum Features {
        @Azure.ResourceManager.featureFileOptions(#{
          featureName: "FeatureA",
          fileName: "feature-a",
          description: "Feature A",
          version: "${version}"
        })
        FeatureA,
      }
    `);

    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-azure-resource-manager/invalid-feature-file-version",
      severity: "error",
      message: "The version in @featureFileOptions must not be empty or contain only whitespace.",
    });
  });

  it("preserves the configured version in feature state", async () => {
    const [result, diagnostics] = await Tester.compileAndDiagnose(t.code`
      @Azure.ResourceManager.featureFiles(Features)
      @armProviderNamespace("Microsoft.Test")
      namespace ${t.namespace("MSTest")};

      enum ${t.enum("Features")} {
        @Azure.ResourceManager.featureFileOptions(#{
          featureName: "FeatureA",
          fileName: "feature-a",
          description: "Feature A",
          version: " 2025-01-01 "
        })
        FeatureA,
      }
    `);

    expectDiagnosticEmpty(diagnostics);
    const feature = result.Features.members.get("FeatureA")!;
    expect(getFeatureOptions(result.program, feature).version).toBe(" 2025-01-01 ");
    expect(getResourceFeatureSet(result.program, result.MSTest)?.get("FeatureA")?.version).toBe(
      " 2025-01-01 ",
    );
  });

  it("uses the last-applied feature file options", async () => {
    const { program, Features } = await Tester.compile(t.code`
      enum ${t.enum("Features")} {
        @Azure.ResourceManager.featureFileOptions(#{
          featureName: "FeatureA",
          fileName: "feature-a",
          description: "Second",
          version: "2025-01-01"
        })
        @Azure.ResourceManager.featureFileOptions(#{
          featureName: "FeatureA",
          fileName: "feature-a",
          description: "First",
          version: "2024-01-01"
        })
        FeatureA,
      }
    `);

    expect(getFeatureOptions(program, Features.members.get("FeatureA")!)).toMatchObject({
      description: "Second",
      version: "2025-01-01",
    });
  });

  it("does not add version to the deprecated ArmFeatureOptions model", async () => {
    const diagnostics = await Tester.diagnose(`
      enum Features {
        @Azure.ResourceManager.Legacy.featureOptions(#{
          featureName: "FeatureA",
          fileName: "feature-a",
          description: "Feature A",
          version: "2025-01-01"
        })
        FeatureA,
      }
    `);

    expectDiagnostics(diagnostics, {
      code: "invalid-argument",
    });
  });
});
