import { deepStrictEqual, ok, strictEqual } from "assert";
import { it } from "vitest";
import {
  createClientCustomizationInput,
  createSdkContextForTester,
  SimpleBaseTester,
  SimpleTester,
} from "../tester.js";

it("single service with versioning should populate apiVersions map", async () => {
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
  const sdkPackage = context.sdkPackage;

  // Check deprecated apiVersion property still works
  strictEqual(sdkPackage.metadata.apiVersion, "v3");

  // Check new apiVersions map
  ok(sdkPackage.metadata.apiVersions);
  strictEqual(sdkPackage.metadata.apiVersions.size, 1);
  strictEqual(sdkPackage.metadata.apiVersions.get("WidgetService"), "v3");
});

it("multiple services should populate apiVersions map with all services", async () => {
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
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
          autoMergeService: true,
        }
      )
      namespace CombineClient;
    `,
    ),
  );

  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;

  // For multi-service, deprecated apiVersion should be undefined
  strictEqual(sdkPackage.metadata.apiVersion, undefined);

  // Check new apiVersions map has both services
  ok(sdkPackage.metadata.apiVersions);
  strictEqual(sdkPackage.metadata.apiVersions.size, 2);
  strictEqual(sdkPackage.metadata.apiVersions.get("ServiceA"), "av2");
  strictEqual(sdkPackage.metadata.apiVersions.get("ServiceB"), "bv2");
});

it("service without versioning should have empty apiVersions map", async () => {
  const { program } = await SimpleTester.compile(`
    @service(#{
      title: "Widget Service",
    })
    namespace WidgetService;
    
    op test(): void;
  `);

  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;

  // Check deprecated apiVersion property
  strictEqual(sdkPackage.metadata.apiVersion, undefined);

  // Check new apiVersions map - service without versions won't have an entry in the map
  ok(sdkPackage.metadata.apiVersions);
  strictEqual(sdkPackage.metadata.apiVersions.size, 0);
});

it("multiple services should ignore api-version config", async () => {
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
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
          autoMergeService: true,
        }
      )
      namespace CombineClient;
    `,
    ),
  );

  // Even with api-version set, multi-service should still use latest versions
  const context = await createSdkContextForTester(program, {
    "api-version": "av1",
  });
  const sdkPackage = context.sdkPackage;

  // For multi-service, deprecated apiVersion should be undefined
  strictEqual(sdkPackage.metadata.apiVersion, undefined);

  // api-version config should be ignored, so all services use their latest versions
  ok(sdkPackage.metadata.apiVersions);
  strictEqual(sdkPackage.metadata.apiVersions.size, 2);
  strictEqual(sdkPackage.metadata.apiVersions.get("ServiceA"), "av2");
  strictEqual(sdkPackage.metadata.apiVersions.get("ServiceB"), "bv2");

  // Validate all clients and sub-clients have the correct apiVersions
  strictEqual(sdkPackage.clients.length, 1);
  const client = sdkPackage.clients[0];
  strictEqual(client.name, "CombineClient");
  strictEqual(client.apiVersions.length, 0);

  const aiClient = client.children!.find((c) => c.name === "AI");
  ok(aiClient);
  deepStrictEqual(aiClient.apiVersions, ["av1", "av2"]);
  strictEqual(aiClient.clientInitialization.parameters[1].name, "apiVersion");
  strictEqual(aiClient.clientInitialization.parameters[1].clientDefaultValue, "av2");

  const biClient = client.children!.find((c) => c.name === "BI");
  ok(biClient);
  deepStrictEqual(biClient.apiVersions, ["bv1", "bv2"]);
  strictEqual(biClient.clientInitialization.parameters[1].name, "apiVersion");
  strictEqual(biClient.clientInitialization.parameters[1].clientDefaultValue, "bv2");
});

it("apiVersion 'all' should populate apiVersions with 'all'", async () => {
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
  const sdkPackage = context.sdkPackage;

  // Check deprecated apiVersion property
  strictEqual(sdkPackage.metadata.apiVersion, "all");

  // Check new apiVersions map should also have "all" to be consistent
  ok(sdkPackage.metadata.apiVersions);
  strictEqual(sdkPackage.metadata.apiVersions.size, 1);
  strictEqual(sdkPackage.metadata.apiVersions.get("WidgetService"), "all");
});
