import { resolvePath, type Diagnostic } from "@typespec/compiler";
import { expectDiagnostics, type EmitterTester } from "@typespec/compiler/testing";
import { assert, describe, expect, it } from "vitest";
import { parse } from "yaml";
import { AutorestEmitterOptions } from "../src/lib.js";
import { ServiceYaml } from "../src/types.js";
import { AzureTester, Tester } from "./test-host.js";

interface EmitServiceYamlResult {
  /** Parsed service.yaml, or undefined if the file was not written. */
  readonly manifest: ServiceYaml | undefined;
  readonly raw: string | undefined;
  readonly diagnostics: readonly Diagnostic[];
}

interface EmitServiceYamlOptions {
  /** Emitter options forwarded to `@azure-tools/typespec-autorest`. */
  readonly options?: AutorestEmitterOptions;
  /** Tester to compile with. Defaults to the non-Azure {@link Tester}. */
  readonly tester?: EmitterTester;
}

async function emitServiceYaml(
  files: string | Record<string, string>,
  { options = {}, tester = Tester }: EmitServiceYamlOptions = {},
): Promise<EmitServiceYamlResult> {
  const instance = await tester.createInstance();
  const [, diagnostics] = await instance.compileAndDiagnose(files, {
    compilerOptions: {
      options: { "@azure-tools/typespec-autorest": { ...options } },
    },
  });
  const path = resolvePath(instance.program.projectRoot, "service.yaml");
  const raw = instance.fs.fs.get(path);
  return {
    manifest: raw === undefined ? undefined : (parse(raw) as ServiceYaml),
    raw,
    diagnostics,
  };
}

const versionedService = `
  @service
  @versioned(Versions)
  namespace MyService {
    enum Versions {
      v2023_01_01: "2023-01-01",
      v2024_01_01_preview: "2024-01-01-preview",
    }
    op ping(): void;
  }
`;

describe("emission from @versioned", () => {
  it("emits ordered versions with source and relative swagger-files", async () => {
    const { manifest } = await emitServiceYaml(versionedService, {
      options: { "service-yaml": "always" },
    });
    expect(manifest).toEqual({
      versions: [
        {
          version: "2023-01-01",
          source: "typespec",
          "swagger-files": [
            "tsp-output/@azure-tools/typespec-autorest/stable/2023-01-01/openapi.json",
          ],
        },
        {
          version: "2024-01-01-preview",
          source: "typespec",
          "swagger-files": [
            "tsp-output/@azure-tools/typespec-autorest/preview/2024-01-01-preview/openapi.json",
          ],
        },
      ],
    });
  });
});

describe("emission trigger option", () => {
  it("`always` writes even when the file does not pre-exist", async () => {
    const { manifest } = await emitServiceYaml(versionedService, {
      options: { "service-yaml": "always" },
    });
    expect(manifest).toBeDefined();
  });

  it("`auto` (default) does not write when the file does not pre-exist", async () => {
    const { manifest } = await emitServiceYaml(versionedService);
    expect(manifest).toBeUndefined();
  });

  it("`auto` writes/updates when the file already exists", async () => {
    const { manifest } = await emitServiceYaml(
      { "main.tsp": versionedService, "service.yaml": "versions: []\n" },
      { options: { "service-yaml": "auto" } },
    );
    assert(manifest);
    expect(manifest.versions.map((v) => v.version)).toEqual(["2023-01-01", "2024-01-01-preview"]);
  });

  it("`never` does not write even when the file already exists", async () => {
    const { raw } = await emitServiceYaml(
      { "main.tsp": versionedService, "service.yaml": "versions: []\n" },
      { options: { "service-yaml": "never" } },
    );
    expect(raw).toEqual("versions: []\n");
  });

  it("preserves comments, unrelated keys, and legacy versions when updating an existing file", async () => {
    const existing = [
      "# Manifest for MyService",
      "versions:",
      "  # first stable version",
      '  - version: "2023-01-01"',
      "    source: typespec",
      "    swagger-files:",
      "      - old/path.json",
      "  # legacy swagger-only version",
      '  - version: "2020-01-01"',
      "    source: swagger",
      "    swagger-files:",
      "      - legacy/openapi.json",
      "# trailing note",
      "custom-key: keep-me",
      "",
    ].join("\n");

    const { raw, manifest } = await emitServiceYaml(
      { "main.tsp": versionedService, "service.yaml": existing },
      { options: { "service-yaml": "auto" } },
    );

    assert(raw);
    // File-level comments and unrelated keys are preserved.
    expect(raw).toContain("# Manifest for MyService");
    expect(raw).toContain("# trailing note");
    expect(raw).toContain("custom-key: keep-me");
    // Per-version comments are preserved.
    expect(raw).toContain("# first stable version");
    expect(raw).toContain("# legacy swagger-only version");
    // Legacy version the emitter no longer knows about is preserved as-is.
    assert(manifest);
    expect(manifest.versions.map((v) => v.version)).toEqual([
      "2023-01-01",
      "2020-01-01",
      "2024-01-01-preview",
    ]);
    const legacy = manifest.versions.find((v) => v.version === "2020-01-01");
    expect(legacy).toEqual({
      version: "2020-01-01",
      source: "swagger",
      "swagger-files": ["legacy/openapi.json"],
    });
    // Regenerated version reflects the current @versioned enum output.
    expect(manifest.versions[0]["swagger-files"]).toEqual([
      "tsp-output/@azure-tools/typespec-autorest/stable/2023-01-01/openapi.json",
    ]);
  });

  it("is idempotent for a manifest that already contains all current versions plus legacy ones", async () => {
    // Mirrors a migrated manifest: legacy swagger-only versions interleaved with the current
    // TypeSpec versions, whose swagger-files already match the emitter output. Re-emitting must
    // not change the file, so `tsp compile` stays clean in CI.
    const existing = [
      "versions:",
      '  - version: "2020-01-01"',
      "    source: swagger",
      "    swagger-files:",
      "      - ../resource-manager/stable/2020-01-01/legacy.json",
      '  - version: "2023-01-01"',
      "    source: typespec",
      "    swagger-files:",
      "      - tsp-output/@azure-tools/typespec-autorest/stable/2023-01-01/openapi.json",
      '  - version: "2024-01-01-preview"',
      "    source: typespec",
      "    swagger-files:",
      "      - tsp-output/@azure-tools/typespec-autorest/preview/2024-01-01-preview/openapi.json",
      "",
    ].join("\n");

    const { raw } = await emitServiceYaml(
      { "main.tsp": versionedService, "service.yaml": existing },
      { options: { "service-yaml": "auto" } },
    );

    expect(raw).toEqual(existing);
  });

  it("preserves a non-typespec (swagger) version the emitter does not produce", async () => {
    // Requirement: entries that are not TypeSpec-generated must survive re-emission even though
    // the emitter never produces them.
    const existing = [
      "versions:",
      '  - version: "2020-01-01"',
      "    source: swagger",
      "    swagger-files:",
      "      - legacy/openapi.json",
      "",
    ].join("\n");

    const { manifest } = await emitServiceYaml(
      { "main.tsp": versionedService, "service.yaml": existing },
      { options: { "service-yaml": "auto" } },
    );

    assert(manifest);
    // Legacy swagger-only version kept verbatim, alongside the current TypeSpec versions.
    expect(manifest.versions.map((v) => v.version)).toEqual([
      "2020-01-01",
      "2023-01-01",
      "2024-01-01-preview",
    ]);
    expect(manifest.versions.find((v) => v.version === "2020-01-01")).toEqual({
      version: "2020-01-01",
      source: "swagger",
      "swagger-files": ["legacy/openapi.json"],
    });
  });

  it("removes a `source: typespec` version the emitter no longer produces", async () => {
    // Requirement: a version that claims to be TypeSpec-generated but is no longer in the spec is
    // stale and must be dropped, while a legacy swagger-only version is still preserved.
    const existing = [
      "versions:",
      '  - version: "2019-01-01"',
      "    source: typespec",
      "    swagger-files:",
      "      - tsp-output/@azure-tools/typespec-autorest/stable/2019-01-01/openapi.json",
      '  - version: "2020-01-01"',
      "    source: swagger",
      "    swagger-files:",
      "      - legacy/openapi.json",
      "",
    ].join("\n");

    const { manifest } = await emitServiceYaml(
      { "main.tsp": versionedService, "service.yaml": existing },
      { options: { "service-yaml": "auto" } },
    );

    assert(manifest);
    // The stale TypeSpec version is gone; the legacy swagger version and current versions remain.
    expect(manifest.versions.map((v) => v.version)).toEqual([
      "2020-01-01",
      "2023-01-01",
      "2024-01-01-preview",
    ]);
    expect(manifest.versions.find((v) => v.version === "2019-01-01")).toBeUndefined();
  });
});

describe("multiple services", () => {
  it("reports a warning and only includes the first service", async () => {
    const { manifest, diagnostics } = await emitServiceYaml(
      `
      @service(#{ title: "One" })
      @versioned(VersionsOne)
      namespace ServiceOne {
        enum VersionsOne { v1: "2023-01-01" }
        op ping(): void;
      }

      @service(#{ title: "Two" })
      @versioned(VersionsTwo)
      namespace ServiceTwo {
        enum VersionsTwo { v1: "2024-01-01" }
        op pong(): void;
      }
      `,
      { options: { "service-yaml": "always" } },
    );
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-autorest/service-yaml-multiple-services",
      severity: "warning",
    });
    assert(manifest);
    expect(manifest.versions.map((v) => v.version)).toEqual(["2023-01-01"]);
  });
});

describe("multiple swagger files per version", () => {
  // A single version can map to multiple output files when ARM legacy feature-file
  // splitting (`output-splitting: legacy-feature-files`) emits one document per feature.
  // The manifest must aggregate all of them under that version's `swagger-files` list.
  const featureSplitService = `
    @armProviderNamespace("Microsoft.Test")
    @versioned(Versions)
    @Azure.ResourceManager.Legacy.features(Features)
    namespace Microsoft.Test;

    enum Versions {
      v2023_01_01: "2023-01-01",
    }

    enum Features {
      @Azure.ResourceManager.Legacy.featureOptions(#{ featureName: "FeatureA", fileName: "featureA", description: "Feature A" })
      FeatureA: "Feature A",
      @Azure.ResourceManager.Legacy.featureOptions(#{ featureName: "FeatureB", fileName: "featureB", description: "Feature B" })
      FeatureB: "Feature B",
    }

    @Azure.ResourceManager.Legacy.feature(Features.FeatureA)
    model FooResource is TrackedResource<FooResourceProperties> {
      ...ResourceNameParameter<FooResource>;
    }
    @Azure.ResourceManager.Legacy.feature(Features.FeatureA)
    model FooResourceProperties {
      ...DefaultProvisioningStateProperty;
    }

    @Azure.ResourceManager.Legacy.feature(Features.FeatureB)
    model BarResource is ProxyResource<BarResourceProperties> {
      ...ResourceNameParameter<BarResource>;
    }
    @Azure.ResourceManager.Legacy.feature(Features.FeatureB)
    model BarResourceProperties {
      ...DefaultProvisioningStateProperty;
    }

    @Azure.ResourceManager.Legacy.feature(Features.FeatureA)
    @armResourceOperations
    interface Foos
      extends Azure.ResourceManager.TrackedResourceOperations<FooResource, FooResourceProperties> {}

    @Azure.ResourceManager.Legacy.feature(Features.FeatureB)
    @armResourceOperations
    interface Bars
      extends Azure.ResourceManager.TrackedResourceOperations<BarResource, BarResourceProperties> {}
  `;

  it("lists every feature file under the single version", async () => {
    const { manifest } = await emitServiceYaml(featureSplitService, {
      tester: AzureTester,
      options: {
        "service-yaml": "always",
        "output-splitting": "legacy-feature-files",
        "output-file": "{version-status}/{version}/{feature}.json",
        // Use a relative arm-types-dir so external common-type refs stay relative.
        "arm-types-dir": "common-types",
      },
    });

    assert(manifest);
    expect(manifest.versions.map((v) => v.version)).toEqual(["2023-01-01"]);
    expect(manifest.versions[0]["swagger-files"]).toEqual([
      "tsp-output/@azure-tools/typespec-autorest/stable/2023-01-01/featureA.json",
      "tsp-output/@azure-tools/typespec-autorest/stable/2023-01-01/featureB.json",
      "tsp-output/@azure-tools/typespec-autorest/stable/2023-01-01/common.json",
    ]);
  });
});
