import { describe, expect, it } from "vitest";
import { createSdkContextForTester, SimpleTester } from "./tester.js";

describe("apiVersion resolution from TypeSpec input", () => {
  it("single versioned service resolves to latest version", async () => {
    const { program } = await SimpleTester.compile(`
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

    const context = await createSdkContextForTester(program);
    const apiVersionsMap = context.sdkPackage.metadata.apiVersions;

    // Single service → map has 1 entry → emitter resolves to that value
    expect(apiVersionsMap.size).toBe(1);
    const resolvedApiVersion = [...apiVersionsMap.values()][0];
    expect(resolvedApiVersion).toBe("v3");
  });

  it("service with api-version 'all' resolves to 'all'", async () => {
    const { program } = await SimpleTester.compile(`
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

    const context = await createSdkContextForTester(program, {
      "api-version": "all",
    });
    const apiVersionsMap = context.sdkPackage.metadata.apiVersions;

    expect(apiVersionsMap.size).toBe(1);
    const resolvedApiVersion = [...apiVersionsMap.values()][0];
    expect(resolvedApiVersion).toBe("all");
  });

  it("service without versioning has empty apiVersions map → undefined", async () => {
    const { program } = await SimpleTester.compile(`
      @service(#{
        title: "Widget Service",
      })
      namespace WidgetService;

      op test(): void;
    `);

    const context = await createSdkContextForTester(program);
    const apiVersionsMap = context.sdkPackage.metadata.apiVersions;

    // Empty map → emitter resolves to undefined
    expect(apiVersionsMap.size).toBe(0);
    let resolvedApiVersion: string | undefined;
    if (apiVersionsMap && apiVersionsMap.size > 0) {
      if (apiVersionsMap.size > 1) {
        resolvedApiVersion = "multiple-versions";
      } else {
        resolvedApiVersion = [...apiVersionsMap.values()][0];
      }
    }
    expect(resolvedApiVersion).toBeUndefined();
  });

  it("multiple services resolve to 'multiple-versions'", async () => {
    const { program } = await SimpleTester.compile(`
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

    const context = await createSdkContextForTester(program);
    const apiVersionsMap = context.sdkPackage.metadata.apiVersions;

    // Multiple services → map has > 1 entry → emitter resolves to "multiple-versions"
    expect(apiVersionsMap.size).toBe(2);
    let resolvedApiVersion: string | undefined;
    if (apiVersionsMap.size > 1) {
      resolvedApiVersion = "multiple-versions";
    } else {
      resolvedApiVersion = [...apiVersionsMap.values()][0];
    }
    expect(resolvedApiVersion).toBe("multiple-versions");
  });
});
