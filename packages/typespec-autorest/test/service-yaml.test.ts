import { resolvePath, type Diagnostic } from "@typespec/compiler";
import { expectDiagnostics } from "@typespec/compiler/testing";
import { assert, describe, expect, it } from "vitest";
import { parse } from "yaml";
import { AutorestEmitterOptions } from "../src/lib.js";
import { ServiceYaml } from "../src/types.js";
import { Tester } from "./test-host.js";

interface EmitServiceYamlResult {
  /** Parsed service.yaml, or undefined if the file was not written. */
  readonly manifest: ServiceYaml | undefined;
  readonly raw: string | undefined;
  readonly diagnostics: readonly Diagnostic[];
}

async function emitServiceYaml(
  files: string | Record<string, string>,
  options: AutorestEmitterOptions = {},
): Promise<EmitServiceYamlResult> {
  const instance = await Tester.createInstance();
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
    const { manifest } = await emitServiceYaml(versionedService, { "service-yaml": "always" });
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
    const { manifest } = await emitServiceYaml(versionedService, { "service-yaml": "always" });
    expect(manifest).toBeDefined();
  });

  it("`auto` (default) does not write when the file does not pre-exist", async () => {
    const { manifest } = await emitServiceYaml(versionedService);
    expect(manifest).toBeUndefined();
  });

  it("`auto` writes/updates when the file already exists", async () => {
    const { manifest } = await emitServiceYaml(
      { "main.tsp": versionedService, "service.yaml": "versions: []\n" },
      { "service-yaml": "auto" },
    );
    assert(manifest);
    expect(manifest.versions.map((v) => v.version)).toEqual(["2023-01-01", "2024-01-01-preview"]);
  });

  it("`never` does not write even when the file already exists", async () => {
    const { raw } = await emitServiceYaml(
      { "main.tsp": versionedService, "service.yaml": "versions: []\n" },
      { "service-yaml": "never" },
    );
    expect(raw).toEqual("versions: []\n");
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
      { "service-yaml": "always" },
    );
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-autorest/service-yaml-multiple-services",
      severity: "warning",
    });
    assert(manifest);
    expect(manifest.versions.map((v) => v.version)).toEqual(["2023-01-01"]);
  });
});
