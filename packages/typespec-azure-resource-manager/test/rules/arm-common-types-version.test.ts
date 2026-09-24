import { Tester } from "#test/tester.js";
import {
  type LinterRuleTester,
  type TesterInstance,
  createLinterRuleTester,
  expectDiagnostics,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { armCommonTypesVersionRule } from "../../src/rules/arm-common-types-version.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

const ruleCode = "@azure-tools/typespec-azure-resource-manager/arm-common-types-version";
const latestVersion = "v6";
const missingVersionMessage =
  "Specify the ARM common-types version using the @armCommonTypesVersion decorator on the service namespace or on each version of the service version enum.";
const outdatedVersionDiagnostic = (target: string, currentVersion = "v3") => ({
  code: ruleCode,
  target,
  message: `Use the latest ARM common-types version '${latestVersion}' instead of '${currentVersion}'.`,
});

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
      code: ruleCode,
      target: "Service",
      message: missingVersionMessage,
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
      code: ruleCode,
      target: "Service",
      message: missingVersionMessage,
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

it("uses the latest version from the common-types registry", async () => {
  await tester
    .expect({
      "main.tsp": `
        @armProviderNamespace
        @armCommonTypesVersion(CommonTypes.Versions.v6)
        namespace Service {}
      `,
      "node_modules/@azure-tools/typespec-azure-resource-manager/lib/common-types/versions.tsp": `
        import "./commontypes.private.decorators.tsp";
        using Versioning;

        @versioned(Versions)
        namespace Azure.ResourceManager.CommonTypes;

        @Azure.ResourceManager.CommonTypes.Private.armCommonTypesVersions
        enum Versions {
          v3, v4, v5, v6, v7,
        }
      `,
    })
    .toEmitDiagnostics({
      code: ruleCode,
      target: "Service",
      message: "Use the latest ARM common-types version 'v7' instead of 'v6'.",
    });
});

it.each(["v3", "v4", "v5"])(
  "reports an older unversioned namespace selection: %s",
  async (version) => {
    await tester
      .expect(
        `
        @armProviderNamespace
        @armCommonTypesVersion(CommonTypes.Versions.${version})
        namespace Service;
      `,
      )
      .toEmitDiagnostics(outdatedVersionDiagnostic("Service", version));
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
        v1,
        v2,
      }
    `,
    )
    .toEmitDiagnostics([outdatedVersionDiagnostic("v1"), outdatedVersionDiagnostic("v2")]);
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
        @armCommonTypesVersion(CommonTypes.Versions.v3)
        v1,
        v2,
      }
    `,
    )
    .toEmitDiagnostics(outdatedVersionDiagnostic("v1"));
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
        @armCommonTypesVersion(CommonTypes.Versions.v3)
        v1,
        @armCommonTypesVersion(CommonTypes.Versions.v6)
        v2,
      }
    `,
    )
    .toEmitDiagnostics(outdatedVersionDiagnostic("v1"));
});

it("supports string version selections", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      @armCommonTypesVersion("v3")
      namespace Service;
    `,
    )
    .toEmitDiagnostics(outdatedVersionDiagnostic("Service"));
});

it("checks each ARM service independently", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      @armCommonTypesVersion(CommonTypes.Versions.v3)
      namespace Older {}

      @armProviderNamespace
      @armCommonTypesVersion(CommonTypes.Versions.v6)
      namespace Current {}
    `,
    )
    .toEmitDiagnostics(outdatedVersionDiagnostic("Older"));
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

it.each(["missing", "outdated"] as const)(
  "respects namespace suppression for %s version diagnostics",
  async (selection) => {
    const diagnostics = await runner.diagnose(
      `
        @armProviderNamespace
        ${selection === "outdated" ? '@armCommonTypesVersion("v3")' : ""}
        #suppress "${ruleCode}" "Intentional compatibility."
        namespace Service;
      `,
      { compilerOptions: { linterRuleSet: { enable: { [ruleCode]: true } } } },
    );
    expectDiagnostics(diagnostics, []);
  },
);

it("suppresses only the selected API version", async () => {
  const diagnostics = await runner.diagnose(
    `
      @armProviderNamespace
      @armCommonTypesVersion(CommonTypes.Versions.v3)
      @versioned(Versions)
      namespace Service;

      enum Versions {
        #suppress "${ruleCode}" "Intentional compatibility."
        v1,
        v2,
      }
    `,
    { compilerOptions: { linterRuleSet: { enable: { [ruleCode]: true } } } },
  );
  expectDiagnostics(diagnostics, [outdatedVersionDiagnostic("v2")]);
});

it("does not report older selections in imported library services", async () => {
  const libraryRunner = await Tester.import("test-common-type-service").createInstance();
  const libraryTester = createLinterRuleTester(
    libraryRunner,
    armCommonTypesVersionRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
  await libraryTester
    .expect({
      "main.tsp": "",
      "node_modules/test-common-type-service/package.json": JSON.stringify({
        name: "test-common-type-service",
        version: "1.0.0",
        tspMain: "main.tsp",
      }),
      "node_modules/test-common-type-service/main.tsp": `
        import "@azure-tools/typespec-azure-resource-manager";
        using Azure.ResourceManager;

        @armProviderNamespace
        @armCommonTypesVersion(CommonTypes.Versions.v3)
        namespace Service;
      `,
    })
    .toBeValid();
});
