import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import type { MetadataSnapshot } from "../src/metadata.js";
import { EmitterTester } from "./tester.js";

function emitMetadata(code: string, compilerOptions: Record<string, unknown> = {}) {
  return EmitterTester.compileAndDiagnose(code, {
    compilerOptions: {
      options: {
        "@azure-tools/typespec-python": {
          "package-name": "azure-test-service",
        },
        ...((compilerOptions.options as Record<string, unknown>) ?? {}),
      },
      ...Object.fromEntries(Object.entries(compilerOptions).filter(([k]) => k !== "options")),
    },
  });
}

function parseMetadata(outputs: Record<string, string>): MetadataSnapshot {
  const content = Object.values(outputs)[0];
  return parseYaml(content) as MetadataSnapshot;
}

describe("apiVersion in emitted metadata", () => {
  it("single versioned service emits latest version as apiVersion", async () => {
    const [{ outputs }] = await emitMetadata(`
      @service(#{
        title: "Widget Service",
      })
      @versioned(WidgetService.Versions)
      namespace WidgetService;

      enum Versions {
        v1,
        v2,
        v3,
      }

      op test(): void;
    `);

    const snapshot = parseMetadata(outputs);
    const pythonMeta = snapshot.languages["python"];
    expect(pythonMeta).toBeDefined();
    expect(pythonMeta[0].apiVersion).toBe("v3");
    expect(pythonMeta[0].sdkType).toBe("stable");
  });

  it("service with api-version 'all' emits 'all' as apiVersion", async () => {
    const [{ outputs }] = await EmitterTester.compileAndDiagnose(
      `
      @service(#{
        title: "Widget Service",
      })
      @versioned(WidgetService.Versions)
      namespace WidgetService;

      enum Versions {
        v1,
        v2,
        v3,
      }

      op test(): void;
    `,
      {
        compilerOptions: {
          options: {
            "@azure-tools/typespec-python": {
              "package-name": "azure-test-service",
              "api-version": "all",
            },
          },
        },
      },
    );

    const snapshot = parseMetadata(outputs);
    expect(snapshot.languages["python"][0].apiVersion).toBe("all");
    expect(snapshot.languages["python"][0].sdkType).toBe("stable");
  });

  it("service without versioning emits undefined apiVersion", async () => {
    const [{ outputs }] = await emitMetadata(`
      @service(#{
        title: "Widget Service",
      })
      namespace WidgetService;

      op test(): void;
    `);

    const snapshot = parseMetadata(outputs);
    expect(snapshot.languages["python"][0].apiVersion).toBeUndefined();
    expect(snapshot.languages["python"][0].sdkType).toBeUndefined();
  });

  it("multiple services emit 'multiple-versions' as apiVersion", async () => {
    const [{ outputs }] = await emitMetadata(`
      @service
      @versioned(VersionsA)
      namespace ServiceA {
        enum VersionsA {
          av1,
          av2,
        }
        interface AI {
          @route("/aTest")
          aTest(@query("api-version") apiVersion: VersionsA): void;
        }
      }
      @service
      @versioned(VersionsB)
      namespace ServiceB {
        enum VersionsB {
          bv1,
          bv2,
        }
        interface BI {
          @route("/bTest")
          bTest(@query("api-version") apiVersion: VersionsB): void;
        }
      }
    `);

    const snapshot = parseMetadata(outputs);
    const pythonMeta = snapshot.languages["python"];
    expect(pythonMeta[0].apiVersion).toBe("multiple-versions");
  });

  it("apiVersion is applied to all language emitters", async () => {
    const [{ outputs }] = await emitMetadata(
      `
      @service(#{
        title: "Widget Service",
      })
      @versioned(WidgetService.Versions)
      namespace WidgetService;

      enum Versions {
        v1,
        v2,
      }

      op test(): void;
    `,
      {
        options: {
          "@azure-tools/typespec-python": {
            "package-name": "azure-test-service",
          },
          "@azure-tools/typespec-java": {
            "package-name": "com.azure:azure-test-service",
          },
        },
      },
    );

    const snapshot = parseMetadata(outputs);
    expect(snapshot.languages["python"][0].apiVersion).toBe("v2");
    expect(snapshot.languages["java"][0].apiVersion).toBe("v2");
    expect(snapshot.languages["python"][0].sdkType).toBe("stable");
    expect(snapshot.languages["java"][0].sdkType).toBe("stable");
  });
});

describe("sdkType in emitted metadata", () => {
  it("preview version with -preview suffix emits sdkType 'preview'", async () => {
    const [{ outputs }] = await emitMetadata(`
      @service(#{
        title: "Widget Service",
      })
      @versioned(WidgetService.Versions)
      namespace WidgetService;

      enum Versions {
        \`2023-01-01\`,
        \`2023-06-01-preview\`,
      }

      op test(): void;
    `);

    const snapshot = parseMetadata(outputs);
    expect(snapshot.languages["python"][0].apiVersion).toBe("2023-06-01-preview");
    expect(snapshot.languages["python"][0].sdkType).toBe("preview");
  });

  it("stable version without -preview suffix emits sdkType 'stable'", async () => {
    const [{ outputs }] = await emitMetadata(`
      @service(#{
        title: "Widget Service",
      })
      @versioned(WidgetService.Versions)
      namespace WidgetService;

      enum Versions {
        \`2023-01-01\`,
        \`2023-06-01\`,
      }

      op test(): void;
    `);

    const snapshot = parseMetadata(outputs);
    expect(snapshot.languages["python"][0].apiVersion).toBe("2023-06-01");
    expect(snapshot.languages["python"][0].sdkType).toBe("stable");
  });

  it("api-version 'all' with a preview version emits sdkType 'preview'", async () => {
    const [{ outputs }] = await EmitterTester.compileAndDiagnose(
      `
      @service(#{
        title: "Widget Service",
      })
      @versioned(WidgetService.Versions)
      namespace WidgetService;

      enum Versions {
        \`2023-01-01\`,
        \`2023-06-01\`,
        \`2024-01-01-preview\`,
      }

      op test(): void;
    `,
      {
        compilerOptions: {
          options: {
            "@azure-tools/typespec-python": {
              "package-name": "azure-test-service",
              "api-version": "all",
            },
          },
        },
      },
    );

    const snapshot = parseMetadata(outputs);
    expect(snapshot.languages["python"][0].apiVersion).toBe("all");
    expect(snapshot.languages["python"][0].sdkType).toBe("preview");
  });
});
