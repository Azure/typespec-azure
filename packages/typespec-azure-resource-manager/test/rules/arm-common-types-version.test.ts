import { Tester } from "#test/tester.js";
import {
  LinterRuleTester,
  TesterInstance,
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
        @service(#{ title: "Test" })
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
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-common-types-version",
    });
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
        @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v4)
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

          @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
          v2;
        }
      `,
    )
    .toBeValid();
});
