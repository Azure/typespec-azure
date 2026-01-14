import { Namespace } from "@typespec/compiler";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});

it("single service with versioning should populate apiVersions map", async () => {
  await runner.compile(`
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

  const sdkPackage = runner.context.sdkPackage;
  
  // Check deprecated apiVersion property still works
  strictEqual(sdkPackage.metadata.apiVersion, "v3");
  
  // Check new apiVersions map
  ok(sdkPackage.metadata.apiVersions);
  strictEqual(sdkPackage.metadata.apiVersions.size, 1);
  strictEqual(sdkPackage.metadata.apiVersions.get("WidgetService"), "v3");
});

it("multiple services should populate apiVersions map with all services", async () => {
  await runner.compileWithCustomization(
    `
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
      }`,
    `
      @client(
        {
          name: "CombineClient",
          service: [ServiceA, ServiceB],
        }
      )
      @useDependency(ServiceA.VersionsA.av2, ServiceB.VersionsB.bv2)
      namespace CombineClient;
    `,
  );

  const sdkPackage = runner.context.sdkPackage;
  
  // For multi-service, deprecated apiVersion should be undefined
  strictEqual(sdkPackage.metadata.apiVersion, undefined);
  
  // Check new apiVersions map has both services
  ok(sdkPackage.metadata.apiVersions);
  strictEqual(sdkPackage.metadata.apiVersions.size, 2);
  strictEqual(sdkPackage.metadata.apiVersions.get("ServiceA"), "av2");
  strictEqual(sdkPackage.metadata.apiVersions.get("ServiceB"), "bv2");
});

it("service without versioning should have empty apiVersions map", async () => {
  await runner.compile(`
    @service(#{
      title: "Widget Service",
    })
    namespace WidgetService;
    
    op test(): void;
  `);

  const sdkPackage = runner.context.sdkPackage;
  
  // Check deprecated apiVersion property
  strictEqual(sdkPackage.metadata.apiVersion, undefined);
  
  // Check new apiVersions map - service without versions won't have an entry in the map
  ok(sdkPackage.metadata.apiVersions);
  strictEqual(sdkPackage.metadata.apiVersions.size, 0);
});

it("apiVersion 'all' should populate apiVersions with latest version", async () => {
  const runnerWithAll = await createSdkTestRunner({
    emitterName: "@azure-tools/typespec-python",
    "api-version": "all",
  });

  await runnerWithAll.compile(`
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

  const sdkPackage = runnerWithAll.context.sdkPackage;
  
  // Check deprecated apiVersion property
  strictEqual(sdkPackage.metadata.apiVersion, "all");
  
  // Check new apiVersions map still has the latest version
  ok(sdkPackage.metadata.apiVersions);
  strictEqual(sdkPackage.metadata.apiVersions.size, 1);
  strictEqual(sdkPackage.metadata.apiVersions.get("WidgetService"), "v3");
});
