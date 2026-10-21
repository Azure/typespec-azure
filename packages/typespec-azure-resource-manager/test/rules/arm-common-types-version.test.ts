import { Tester } from "#test/tester.js";
import {
  type DiagnosticMatch,
  type LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { armCommonTypesVersionRule } from "../../src/rules/arm-common-types-version.js";

let tester: LinterRuleTester;

const ruleCode = "@azure-tools/typespec-azure-resource-manager/arm-common-types-version";
const latestVersion = "v6";
const missingVersionMessage =
  "Specify the ARM common-types version using the @armCommonTypesVersion decorator on the service namespace or on each version of the service version enum.";
const outdatedVersionDiagnostic = (pos: number, currentVersion = "v3"): DiagnosticMatch => ({
  code: ruleCode,
  pos,
  message: `Use the latest ARM common-types version '${latestVersion}' instead of '${currentVersion}'.`,
});

beforeEach(async () => {
  const runner = await Tester.createInstance();
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
    .toEmitDiagnostics((x) => ({
      code: ruleCode,
      pos: x.pos.target.pos,
      message: missingVersionMessage,
    }));
});

it("emits diagnostic when unversioned service namespace is missing a common type version", async () => {
  await tester
    .expect(
      `
        /*target*/@service(#{ title: "Test" })
        @armProviderNamespace("Contoso.Service")
        namespace Service;
      `,
    )
    .toEmitDiagnostics((x) => ({
      code: ruleCode,
      pos: x.pos.target.pos,
      message: missingVersionMessage,
    }));
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
          @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v6)
          v1;

          @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v6)
          v2;
        }
      `,
    )
    .toBeValid();
});

it("does not emit when an unversioned service selects the latest version", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      @armCommonTypesVersion(CommonTypes.Versions.v6)
      namespace Service;
    `,
    )
    .toBeValid();
});

it.each(["v3", "v4", "v5"])(
  "reports an older unversioned namespace selection: %s",
  async (version) => {
    await tester
      .expect(
        `
        /*target*/@armProviderNamespace
        @armCommonTypesVersion(CommonTypes.Versions.${version})
        namespace Service;
      `,
      )
      .toEmitDiagnostics((x) => outdatedVersionDiagnostic(x.pos.target.pos, version));
  },
);

it("reports an older namespace selection for each API version", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      @armCommonTypesVersion(CommonTypes.Versions.v3)
      @versioned(Versions)
      namespace Service;

      enum Versions {
        /*v1*/v1,
        /*v2*/v2,
      }
    `,
    )
    .toEmitDiagnostics((x) => [
      outdatedVersionDiagnostic(x.pos.v1.pos),
      outdatedVersionDiagnostic(x.pos.v2.pos),
    ]);
});

it("reports an older enum-member override of a latest namespace selection", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      @armCommonTypesVersion(CommonTypes.Versions.v6)
      @versioned(Versions)
      namespace Service;

      enum Versions {
        /*target*/@armCommonTypesVersion(CommonTypes.Versions.v3)
        v1,
        v2,
      }
    `,
    )
    .toEmitDiagnostics((x) => outdatedVersionDiagnostic(x.pos.target.pos));
});

it("accepts a latest enum-member override of an older namespace selection", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      @armCommonTypesVersion(CommonTypes.Versions.v3)
      @versioned(Versions)
      namespace Service;

      enum Versions {
        @armCommonTypesVersion(CommonTypes.Versions.v6)
        v1,
      }
    `,
    )
    .toBeValid();
});

it("checks explicit per-version selections without a namespace selection", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      @versioned(Versions)
      namespace Service;

      enum Versions {
        /*target*/@armCommonTypesVersion(CommonTypes.Versions.v3)
        v1,
        @armCommonTypesVersion(CommonTypes.Versions.v6)
        v2,
      }
    `,
    )
    .toEmitDiagnostics((x) => outdatedVersionDiagnostic(x.pos.target.pos));
});

it("supports string version selections", async () => {
  await tester
    .expect(
      `
      /*target*/@armProviderNamespace
      @armCommonTypesVersion("v3")
      namespace Service;
    `,
    )
    .toEmitDiagnostics((x) => outdatedVersionDiagnostic(x.pos.target.pos));
});

it("checks each ARM service independently", async () => {
  await tester
    .expect(
      `
      /*target*/@armProviderNamespace
      @armCommonTypesVersion(CommonTypes.Versions.v3)
      namespace Older {}

      @armProviderNamespace
      @armCommonTypesVersion(CommonTypes.Versions.v6)
      namespace Current {}
    `,
    )
    .toEmitDiagnostics((x) => outdatedVersionDiagnostic(x.pos.target.pos));
});

it("does not check non-ARM services or Azure library namespaces", async () => {
  await tester
    .expect(
      `
      @service
      @armCommonTypesVersion(CommonTypes.Versions.v3)
      namespace DataPlane {}

      namespace Azure.Core {
        model TestModel {}
      }

      @armLibraryNamespace
      namespace Azure.ResourceManager.TestLibrary {}
    `,
    )
    .toBeValid();
});

it("checks only the selected version, not legacy common-type usages", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      @armCommonTypesVersion(CommonTypes.Versions.v6)
      namespace Service;

      model Widget is TrackedResource<WidgetProperties> {
        ...ResourceNameParameter<Widget>;
        ...Legacy.ManagedServiceIdentityV4Property;
      }

      model WidgetProperties {}

      @armResourceOperations
      interface Widgets {
        get is ArmResourceRead<Widget>;
      }
    `,
    )
    .toBeValid();
});
