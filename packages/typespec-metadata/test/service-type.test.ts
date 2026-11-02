import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import type { MetadataSnapshot } from "../src/metadata.js";
import { ApiTester } from "./tester.js";

const ServiceTypeTester = ApiTester.emit("@azure-tools/typespec-metadata", {});

async function emitType(code: string | Record<string, string>) {
  const { outputs } = await ServiceTypeTester.compile(code);
  return (parseYaml(Object.values(outputs)[0]) as MetadataSnapshot).typespec;
}

describe("service type in emitted metadata", () => {
  it("classifies a service without ARM imports as data", async () => {
    expect(await emitType("@service namespace DataService; op test(): void;")).toEqual({
      namespace: "DataService",
      type: "data",
    });
  });

  it.each([
    ["machinelearningservices/data-plane/AIAssets", "Microsoft.MachineLearningServices"],
    ["maps/data-plane/Geolocation", "MapsGeolocation"],
    ["maps/data-plane/Render", "MapsRender"],
    ["maps/data-plane/Route", "MapsRoute"],
    ["maps/data-plane/Timezone", "MapsTimezone"],
    ["maps/data-plane/Weather", "MapsWeather"],
    ["search/data-plane/Search", "Search"],
  ])("classifies %s with transitive ARM imports as data", async (_, namespace) => {
    expect(
      await emitType({
        "main.tsp": `
          import "./common.tsp";
          @service namespace ${namespace};
          op test(): void;
        `,
        "common.tsp": `import "@azure-tools/typespec-azure-resource-manager";`,
      }),
    ).toEqual({ namespace, type: "data" });
  });

  it("classifies monitor/data-plane/Insights with ARM common types as data", async () => {
    expect(
      await emitType(`
        import "@azure-tools/typespec-azure-resource-manager";
        @service
        @Azure.ResourceManager.armCommonTypesVersion("v6")
        namespace MonitorQueryMetrics;
        op test(): void;
      `),
    ).toEqual({ namespace: "MonitorQueryMetrics", type: "data" });
  });

  it("classifies an ARM provider as management", async () => {
    expect(
      await emitType(`
        import "@azure-tools/typespec-azure-resource-manager";
        @Azure.ResourceManager.armProviderNamespace
        namespace Microsoft.Test;
      `),
    ).toEqual({ namespace: "Microsoft.Test", type: "management" });
  });

  it("inherits ARM classification from a parent namespace", async () => {
    expect(
      await emitType(`
        import "@azure-tools/typespec-azure-resource-manager";
        @Azure.ResourceManager.armProviderNamespace
        namespace Microsoft.Common {
          @service namespace Nested {
            op test(): void;
          }
        }
      `),
    ).toEqual({ namespace: "Microsoft.Common.Nested", type: "management" });
  });

  it("does not classify a data service as management because of an unrelated ARM provider", async () => {
    expect(
      await emitType(`
        import "@azure-tools/typespec-azure-resource-manager";
        @service namespace DataService { op test(): void; }
        @Azure.ResourceManager.armProviderNamespace
        namespace Microsoft.Other {}
      `),
    ).toEqual({ namespace: "DataService", type: "data" });
  });
});
