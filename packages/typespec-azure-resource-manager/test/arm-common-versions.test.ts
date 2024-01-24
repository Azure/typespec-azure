import { describe, expect, it } from "vitest";
import { OpenAPI2Document } from "../../typespec-autorest/src/types.js";
import { openApiForVersions } from "./test-host.js";

describe("typespec-azure-resource-manager: arm-common-versions", () => {
  function expectCommonVersion(document: OpenAPI2Document, version: string) {
    expect(document.paths["/{subscriptionId}"].get?.parameters[0]).toEqual({
      $ref: `../../common-types/resource-management/${version}/types.json#/parameters/SubscriptionIdParameter`,
    });
  }

  it("defaults to v3", async () => {
    const openapis = await openApiForVersions(
      `
      @armProviderNamespace
      @versioned(Versions)
      @service
      namespace Test;
      
      enum Versions {
        serviceVersion1,
        serviceVersion2,
      }
      
      op test(...SubscriptionIdParameter): void;
      `,
      ["serviceVersion1", "serviceVersion2"]
    );

    expectCommonVersion(openapis.serviceVersion1, "v3");
    expectCommonVersion(openapis.serviceVersion2, "v3");
  });

  it("can specify a global version", async () => {
    const openapis = await openApiForVersions(
      `
      @armProviderNamespace
      @versioned(Versions)
      @armCommonTypesVersion(CommonTypes.Versions.v4)
      @service
      namespace Test;
      
      enum Versions {
        serviceVersion1,
        serviceVersion2,
      }
      
      op test(...SubscriptionIdParameter): void;
      `,
      ["serviceVersion1", "serviceVersion2"]
    );

    expectCommonVersion(openapis.serviceVersion1, "v4");
    expectCommonVersion(openapis.serviceVersion2, "v4");
  });

  it("can specify a different common types version per api version", async () => {
    const openapis = await openApiForVersions(
      `
      @armProviderNamespace
      @versioned(Versions)
      @service
      namespace Test;
      
      enum Versions {
        @armCommonTypesVersion(CommonTypes.Versions.v3)
        serviceVersion1,
      
        @armCommonTypesVersion(CommonTypes.Versions.v5)
        serviceVersion2,
      }
      
      op test(...SubscriptionIdParameter): void;
      `,
      ["serviceVersion1", "serviceVersion2"]
    );

    expectCommonVersion(openapis.serviceVersion1, "v3");
    expectCommonVersion(openapis.serviceVersion2, "v5");
  });
});
