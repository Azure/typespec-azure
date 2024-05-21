import type { Namespace, Operation } from "@typespec/compiler";
import { getService } from "@typespec/compiler";
import { ok } from "assert";
import { expect, it } from "vitest";
import { getArmCommonTypeOpenAPIRef } from "../src/common-types.js";
import { createAzureResourceManagerTestRunner } from "./test-host.js";

async function computeCommonTypeRefs<T extends string>(
  code: string,
  versions: T[]
): Promise<Record<T, string | undefined>> {
  const runner = await createAzureResourceManagerTestRunner();
  const { Service, test } = (await runner.compile(`
      ${code}
      @test op test(...SubscriptionIdParameter): void;
    `)) as { test: Operation; Service: Namespace };

  const prop = test.parameters.properties.get("subscriptionId");
  ok(prop);
  const result: Record<string, string | undefined> = {};
  for (const version of versions) {
    result[version] = getArmCommonTypeOpenAPIRef(runner.program, prop, {
      service: getService(runner.program, Service)!,
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
    ["serviceVersion1", "serviceVersion2"]
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
    ["serviceVersion1", "serviceVersion2"]
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
    ["serviceVersion1", "serviceVersion2"]
  );

  expect(refs).toEqual({
    serviceVersion1: "{arm-types-dir}/v3/types.json#/parameters/SubscriptionIdParameter",
    serviceVersion2: "{arm-types-dir}/v5/types.json#/parameters/SubscriptionIdParameter",
  });
});
