import { getService, Namespace } from "@typespec/compiler";
import { t } from "@typespec/compiler/testing";
import { ok } from "assert";
import { expect, it } from "vitest";
import { getArmCommonTypeOpenAPIRef } from "../src/common-types.js";
import { Tester } from "./tester.js";

async function computeCommonTypeRefs<T extends string>(
  code: string,
  versions: T[],
): Promise<Record<T, string | undefined>> {
  const { Service, test, program } = await Tester.compile(t.code`
    ${code}
      op ${t.op("test")}(...SubscriptionIdParameter): void;
  `);

  const prop = test.parameters.properties.get("subscriptionId");
  ok(prop);
  const result: Record<string, string | undefined> = {};
  for (const version of versions) {
    result[version] = getArmCommonTypeOpenAPIRef(program, prop, {
      service: getService(program, Service as Namespace)!,
      version,
    });
  }
  return result;
}

it("defaults to v3", async () => {
  const refs = await computeCommonTypeRefs(
    `
      @armProviderNamespace
      @versioned(Versions)
      @service
      @test
      namespace Service;
      
      enum Versions {
        serviceVersion1,
        serviceVersion2,
      }
      `,
    ["serviceVersion1", "serviceVersion2"],
  );

  expect(refs).toEqual({
    serviceVersion1: "{arm-types-dir}/v3/types.json#/parameters/SubscriptionIdParameter",
    serviceVersion2: "{arm-types-dir}/v3/types.json#/parameters/SubscriptionIdParameter",
  });
});

it("can specify a global version", async () => {
  const refs = await computeCommonTypeRefs(
    `
      @armProviderNamespace
      @versioned(Versions)
      @service
      @test
      @armCommonTypesVersion(CommonTypes.Versions.v4)
      namespace Service;
      
      enum Versions {
        serviceVersion1,
        serviceVersion2,
      }
      `,
    ["serviceVersion1", "serviceVersion2"],
  );

  expect(refs).toEqual({
    serviceVersion1: "{arm-types-dir}/v4/types.json#/parameters/SubscriptionIdParameter",
    serviceVersion2: "{arm-types-dir}/v4/types.json#/parameters/SubscriptionIdParameter",
  });
});

it("can specify a different common types version per api version", async () => {
  const refs = await computeCommonTypeRefs(
    `
      @armProviderNamespace
      @versioned(Versions)
      @service
      @test
      namespace Service;
      
      enum Versions {
        @armCommonTypesVersion(CommonTypes.Versions.v3)
        serviceVersion1,

        @armCommonTypesVersion(CommonTypes.Versions.v5)
        serviceVersion2,
      }
      `,
    ["serviceVersion1", "serviceVersion2"],
  );

  expect(refs).toEqual({
    serviceVersion1: "{arm-types-dir}/v3/types.json#/parameters/SubscriptionIdParameter",
    serviceVersion2: "{arm-types-dir}/v5/types.json#/parameters/SubscriptionIdParameter",
  });
});
