import type { Diagnostic } from "@typespec/compiler";
import {
  expectDiagnosticEmpty,
  expectDiagnostics,
  resolveVirtualPath,
} from "@typespec/compiler/testing";
import { describe, expect, it } from "vitest";
import type { OpenAPI2Document } from "../../src/openapi2-document.js";
import { AzureTester, compileVersionedOpenAPI } from "../test-host.js";

const emitterOptions = {
  "emitter-output-dir": resolveVirtualPath("./tsp-output"),
  "output-file": "{emitter-output-dir}/openapi.json",
};

async function emitDefault(code: string): Promise<[OpenAPI2Document, readonly Diagnostic[]]> {
  const tester = await AzureTester.createInstance();
  const [{ outputs }, diagnostics] = await tester.compileAndDiagnose(code, {
    compilerOptions: {
      options: {
        "@azure-tools/typespec-autorest": emitterOptions,
      },
    },
  });

  expect(outputs["openapi.json"]).toBeDefined();
  return [JSON.parse(outputs["openapi.json"]), diagnostics];
}

async function emitFeatures(
  code: string,
): Promise<[Record<string, OpenAPI2Document>, readonly Diagnostic[]]> {
  const tester = await AzureTester.createInstance();
  const [{ outputs }, diagnostics] = await tester.compileAndDiagnose(code, {
    compilerOptions: {
      options: {
        "@azure-tools/typespec-autorest": {
          ...emitterOptions,
          "output-splitting": "legacy-feature-files",
          "output-file": "{emitter-output-dir}/{feature}.json",
        },
      },
    },
  });

  return [
    Object.fromEntries(
      Object.entries(outputs).map(([name, content]) => [
        name.replace(/\.json$/, ""),
        JSON.parse(content),
      ]),
    ),
    diagnostics,
  ];
}

const suppressStandardOperations =
  '#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "Test operation."';

describe("client API version inference", () => {
  it("infers a default document version when all interface clients use the same override", async () => {
    const [openapi, diagnostics] = await emitDefault(`
      @service
      @info(#{version: "fallback-version"})
      namespace Microsoft.Test {
        @Azure.ClientGenerator.Core.Legacy.overrideClientApiVersion("2020-01-01")
        interface Widgets {
          ${suppressStandardOperations}
          @get @route("/widgets") op list(): string[];
        }

        @Azure.ClientGenerator.Core.Legacy.overrideClientApiVersion("2020-01-01")
        interface Gadgets {
          ${suppressStandardOperations}
          @get @route("/gadgets") op list(): string[];
        }
      }
    `);

    expectDiagnosticEmpty(diagnostics);
    expect(openapi.info.version).toBe("2020-01-01");
  });

  it("infers each feature document independently and leaves common on the fallback", async () => {
    const [openapi, diagnostics] = await emitFeatures(`
      @service
      @info(#{version: "fallback-version"})
      @Azure.ResourceManager.featureFiles(Features)
      @armProviderNamespace("Microsoft.Test")
      namespace Microsoft.Test;

      enum Features {
        FeatureA,
        FeatureB,
        Common,
      }

      @Azure.ResourceManager.featureFile(Features.FeatureA)
      @Azure.ClientGenerator.Core.Legacy.overrideClientApiVersion("2020-01-01")
      interface FeatureAOperations {
        ${suppressStandardOperations}
        @get @route("/feature-a") op get(): string;
      }

      @Azure.ResourceManager.featureFile(Features.FeatureB)
      @Azure.ClientGenerator.Core.Legacy.overrideClientApiVersion("2021-02-02")
      interface FeatureBOperations {
        ${suppressStandardOperations}
        @get @route("/feature-b") op get(): string;
      }
    `);

    expectDiagnosticEmpty(diagnostics);
    expect(openapi.featureA.info.version).toBe("2020-01-01");
    expect(openapi.featureB.info.version).toBe("2021-02-02");
    expect(openapi.common.info.version).toBe("fallback-version");
  });

  it("warns once for a mixture of overridden and ordinary clients and retains fallback", async () => {
    const [openapi, diagnostics] = await emitDefault(`
      @service
      @info(#{version: "fallback-version"})
      namespace Microsoft.Test {
        @Azure.ClientGenerator.Core.Legacy.overrideClientApiVersion("2020-01-01")
        interface Overridden {
          ${suppressStandardOperations}
          @get @route("/overridden") op get(): string;
        }

        interface Ordinary {
          ${suppressStandardOperations}
          @get @route("/ordinary") op get(): string;
        }
      }
    `);

    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-autorest/inconsistent-client-api-version-override",
      severity: "warning",
      message:
        "Operations emitted to the same OpenAPI document must specify one consistent `@overrideClientApiVersion` value. Found values: 2020-01-01, <none>. The normal document version fallback-version will be retained.",
    });
    expect(diagnostics[0].target.kind).toBe("Namespace");
    expect(openapi.info.version).toBe("fallback-version");
  });

  it("warns once for two distinct overrides and retains fallback", async () => {
    const [openapi, diagnostics] = await emitDefault(`
      @service
      @info(#{version: "fallback-version"})
      namespace Microsoft.Test {
        @Azure.ClientGenerator.Core.Legacy.overrideClientApiVersion("2020-01-01")
        interface First {
          ${suppressStandardOperations}
          @get @route("/first") op get(): string;
        }

        @Azure.ClientGenerator.Core.Legacy.overrideClientApiVersion("2021-02-02")
        interface Second {
          ${suppressStandardOperations}
          @get @route("/second") op get(): string;
        }
      }
    `);

    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-autorest/inconsistent-client-api-version-override",
      severity: "warning",
      message:
        "Operations emitted to the same OpenAPI document must specify one consistent `@overrideClientApiVersion` value. Found values: 2020-01-01, 2021-02-02. The normal document version fallback-version will be retained.",
    });
    expect(diagnostics[0].target.kind).toBe("Namespace");
    expect(openapi.info.version).toBe("fallback-version");
  });

  it("gives explicit feature versions highest precedence and suppresses file mismatch warnings", async () => {
    const [openapi, diagnostics] = await emitFeatures(`
      @service
      @info(#{version: "fallback-version"})
      @Azure.ResourceManager.featureFiles(Features)
      @armProviderNamespace("Microsoft.Test")
      namespace Microsoft.Test;

      enum Features {
        @Azure.ResourceManager.featureFileOptions(#{
          featureName: "FeatureA",
          fileName: "feature-a",
          description: "Feature A",
          version: "explicit-feature-version"
        })
        FeatureA,
        FeatureB,
        Common,
      }

      @Azure.ResourceManager.featureFile(Features.FeatureA)
      @Azure.ClientGenerator.Core.Legacy.overrideClientApiVersion("2020-01-01")
      interface First {
        ${suppressStandardOperations}
        @get @route("/first") op get(): string;
      }

      @Azure.ResourceManager.featureFile(Features.FeatureA)
      @Azure.ClientGenerator.Core.Legacy.overrideClientApiVersion("2021-02-02")
      interface Second {
        ${suppressStandardOperations}
        @get @route("/second") op get(): string;
      }
    `);

    expectDiagnosticEmpty(diagnostics);
    expect(openapi["feature-a"].info.version).toBe("explicit-feature-version");
    expect(openapi.featureB.info.version).toBe("fallback-version");
    expect(openapi.common.info.version).toBe("fallback-version");
  });

  it("preserves existing fallback behavior when overrides and explicit feature versions are omitted", async () => {
    const [openapi, diagnostics] = await emitFeatures(`
      @service
      @info(#{version: "fallback-version"})
      @Azure.ResourceManager.featureFiles(Features)
      @armProviderNamespace("Microsoft.Test")
      namespace Microsoft.Test;

      enum Features {
        @Azure.ResourceManager.featureFileOptions(#{
          featureName: "FeatureA",
          fileName: "feature-a",
          description: "Feature A"
        })
        FeatureA,
        FeatureB,
        Common,
      }

      @Azure.ResourceManager.featureFile(Features.FeatureA)
      interface FeatureAOperations {
        ${suppressStandardOperations}
        @get @route("/feature-a") op get(): string;
      }
    `);

    expectDiagnosticEmpty(diagnostics);
    expect(openapi["feature-a"].info.version).toBe("fallback-version");
    expect(openapi.featureB.info.version).toBe("fallback-version");
    expect(openapi.common.info.version).toBe("fallback-version");
  });

  it("uses replacement interface overrides in their corresponding service projections", async () => {
    const documents = await compileVersionedOpenAPI(
      `
        @service
        @versioned(Versions)
        namespace Microsoft.Test;

        enum Versions {
          v1: "2024-01-01",
          v2: "2025-01-01",
        }

        @removed(Versions.v2)
        @renamedFrom(Versions.v2, "Operations")
        @Azure.ClientGenerator.Core.Legacy.overrideClientApiVersion("legacy-version")
        interface OperationsV1 {
          @sharedRoute
          @get @route("/widgets") op get(): string;
        }

        @added(Versions.v2)
        @Azure.ClientGenerator.Core.Legacy.overrideClientApiVersion("replacement-version")
        interface Operations {
          @sharedRoute
          @get @route("/widgets") op get(): string;
        }
      `,
      ["2024-01-01", "2025-01-01"],
      { tester: await AzureTester.createInstance() },
    );

    expect(documents["2024-01-01"].info.version).toBe("legacy-version");
    expect(documents["2025-01-01"].info.version).toBe("replacement-version");
  });
});
