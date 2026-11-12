import { Tester } from "#test/tester.js";
import {
  type LinterRuleTester,
  type TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { armCommonTypesVersionRule } from "../../src/rules/arm-common-types-version.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    armCommonTypesVersionRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it("emits diagnostic when a version in the enum is missing a common type version", async () => {
  await tester
    .expect(
      `
        /*target*/@service(#{ title: "Test" })
        @versioned(Service.Versions)
        @armProviderNamespace("Contoso.Service")
        namespace Service;

        enum Versions {
          v1;

          @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v4)
          v2;
        }
      `,
    )
    .toEmitDiagnostics((result) => ({
      code: "@azure-tools/typespec-azure-resource-manager/arm-common-types-version",
      message:
        "Specify the ARM common-types version using the @armCommonTypesVersion decorator on the service namespace or on each version of the service version enum.",
      pos: result.pos.target.pos,
    }));
});

it("emits diagnostic when unversioned service namespace is missing a common type version", async () => {
  await tester
    .expect(
      `
        @service(#{ title: "Test" })
        @armProviderNamespace("Contoso.Service")
        namespace Service;
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-common-types-version",
    });
});

it("does not emit when the service namespace has a common type version without version on enum values", async () => {
  await tester
    .expect(
      `
        @service(#{ title: "Test" })
        @versioned(Service.Versions)
        @armProviderNamespace("Contoso.Service")
        @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v6)
        namespace Service;

        enum Versions {
          v1;
          v2;
        }
      `,
    )
    .toBeValid();
});

it("does not emit when the service version enum has a common type version on all enum values", async () => {
  await tester
    .expect(
      `
        @service(#{ title: "Test" })
        @versioned(Service.Versions)
        @armProviderNamespace("Contoso.Service")
        namespace Service;

        enum Versions {
          @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v4)
          v1;

          @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v6)
          v2;
        }
      `,
    )
    .toBeValid();
});

it.each([
  {
    name: "latest inherits a current namespace default while history overrides it",
    defaultVersion: "v6",
    historical: '@armCommonTypesVersion("v4")',
    latest: "",
  },
  {
    name: "latest overrides an outdated namespace default",
    defaultVersion: "v4",
    historical: "",
    latest: '@armCommonTypesVersion("v6")',
  },
])("does not warn when $name", async ({ defaultVersion, historical, latest }) => {
  await tester
    .expect(
      `
      @armProviderNamespace
      @versioned(Versions)
      @armCommonTypesVersion("${defaultVersion}")
      namespace Service;
      enum Versions {
        ${historical}
        old: "2024-01-01",
        ${latest}
        current: "2025-01-01",
      }
      `,
    )
    .toBeValid();
});

it.each([
  { name: "outdated namespace default", defaultVersion: "v4", latest: "" },
  {
    name: "outdated member override of a current namespace default",
    defaultVersion: "v6",
    latest: '@armCommonTypesVersion("v4")',
  },
  {
    name: "all-explicit member configuration without a namespace default",
    defaultVersion: undefined,
    latest: '@armCommonTypesVersion("v4")',
  },
])("reports only the latest API member for $name", async ({ defaultVersion, latest }) => {
  await tester
    .expect(
      `
      @armProviderNamespace
      @versioned(Versions)
      ${defaultVersion ? `@armCommonTypesVersion("${defaultVersion}")` : ""}
      namespace Service;
      enum Versions {
        @armCommonTypesVersion("v4")
        old: "2024-01-01",
        /*target*/${latest ? `${latest}\n` : ""}current: "2025-01-01",
      }
      `,
    )
    .toEmitDiagnostics((result) => ({
      code: "@azure-tools/typespec-azure-resource-manager/arm-common-types-version",
      message: "Use the latest ARM common-types version 'v6' instead of 'v4'.",
      pos: result.pos.target.pos,
    }));
});

it.each([
  { historical: "2024-01-01-preview", latest: "2025-01-01" },
  { historical: "2024-01-01", latest: "2025-01-01-preview" },
])("uses one timeline when $latest is declared last", async ({ historical, latest }) => {
  await tester
    .expect(
      `
      @armProviderNamespace
      @versioned(Versions)
      namespace Service;
      enum Versions {
        @armCommonTypesVersion("v4")
        historical: "${historical}",
        @armCommonTypesVersion("v6")
        latest: "${latest}",
      }
      `,
    )
    .toBeValid();

  await tester
    .expect(
      `
      @armProviderNamespace
      @versioned(Versions)
      namespace Service;
      enum Versions {
        @armCommonTypesVersion("v6")
        historical: "${historical}",
        /*target*/@armCommonTypesVersion("v4")
        latest: "${latest}",
      }
      `,
    )
    .toEmitDiagnostics((result) => ({
      code: "@azure-tools/typespec-azure-resource-manager/arm-common-types-version",
      message: "Use the latest ARM common-types version 'v6' instead of 'v4'.",
      pos: result.pos.target.pos,
    }));
});

it("reports missing configuration instead of implicit-default outdated guidance", async () => {
  await tester
    .expect(
      `
      /*target*/@armProviderNamespace
      @versioned(Versions)
      namespace Service;
      enum Versions {
        old: "2024-01-01",
        @armCommonTypesVersion("v4")
        latest: "2025-01-01",
      }
      `,
    )
    .toEmitDiagnostics((result) => ({
      code: "@azure-tools/typespec-azure-resource-manager/arm-common-types-version",
      message:
        "Specify the ARM common-types version using the @armCommonTypesVersion decorator on the service namespace or on each version of the service version enum.",
      pos: result.pos.target.pos,
    }));
});

it("reports outdated configuration on an unversioned ARM namespace", async () => {
  await tester
    .expect(
      `
      /*target*/@armProviderNamespace
      @armCommonTypesVersion("v4")
      namespace Service;
      `,
    )
    .toEmitDiagnostics((result) => ({
      code: "@azure-tools/typespec-azure-resource-manager/arm-common-types-version",
      message: "Use the latest ARM common-types version 'v6' instead of 'v4'.",
      pos: result.pos.target.pos,
    }));
});

it("accepts current configuration on an unversioned ARM namespace", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      @armCommonTypesVersion("v6")
      namespace Service;
      `,
    )
    .toBeValid();
});

it("does not check outdated selections on a non-ARM service", async () => {
  await tester
    .expect(
      `
      @service
      @armCommonTypesVersion("v4")
      namespace Service;
      `,
    )
    .toBeValid();
});
