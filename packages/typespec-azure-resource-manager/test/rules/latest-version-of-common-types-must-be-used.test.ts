import { Tester } from "#test/tester.js";
import {
  type LinterRuleTester,
  type TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { latestVersionOfCommonTypesMustBeUsedRule } from "../../src/rules/latest-version-of-common-types-must-be-used.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    latestVersionOfCommonTypesMustBeUsedRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

const latestVersion = "v6";

const serviceHeader = (
  namespaceCommonTypesVersion: string,
  versionMemberCommonTypesVersion = namespaceCommonTypesVersion,
  extraVersions = "",
) => `
  @armProviderNamespace
  @service(#{ title: "Test Service" })
  @versioned(Versions)
  @armCommonTypesVersion(CommonTypes.Versions.${namespaceCommonTypesVersion})
  namespace Microsoft.TestService;

  enum Versions {
    @useDependency(Azure.ResourceManager.CommonTypes.Versions.${versionMemberCommonTypesVersion})
    v2024_01_01: "2024-01-01",
    ${extraVersions}
  }
`;

const widgetResource = `
  model Widget is TrackedResource<WidgetProperties> {
    @key("widgetName")
    @segment("widgets")
    @doc("The name of the widget")
    @path
    @pattern("^[a-zA-Z0-9_-]+$")
    name: string;
  }

  @doc("Widget resource properties.")
  model WidgetProperties {
    @doc("Description")
    description?: string;

    @doc("Resource provisioning state")
    @visibility(Lifecycle.Read)
    provisioningState?: ResourceProvisioningState;
  }

  interface Operations extends Azure.ResourceManager.Operations {}

  @armResourceOperations
  interface Widgets {
    get is ArmResourceRead<Widget>;
    createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
    update is ArmResourcePatchAsync<Widget, WidgetProperties>;
    delete is ArmResourceDeleteWithoutOkAsync<Widget>;
    listByResourceGroup is ArmResourceListByParent<Widget>;
  }
`;

it("emits diagnostic when a versioned ARM service selects an older namespace common-types version", async () => {
  await tester.expect(`${serviceHeader("v3")} ${widgetResource}`).toEmitDiagnostics({
    code: "@azure-tools/typespec-azure-resource-manager/latest-version-of-common-types-must-be-used",
    message: `Use the latest ARM common-types version '${latestVersion}' instead of 'v3'.`,
  });
});

it("does not emit when a versioned ARM service selects the latest namespace common-types version", async () => {
  await tester.expect(`${serviceHeader(latestVersion)} ${widgetResource}`).toBeValid();
});

it("emits diagnostic when a version enum member overrides the namespace back to an older common-types version", async () => {
  await tester
    .expect(
      `
        ${serviceHeader(latestVersion, "v3")}

        @@armCommonTypesVersion(Versions.v2024_01_01, Azure.ResourceManager.CommonTypes.Versions.v3);

        ${widgetResource}
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/latest-version-of-common-types-must-be-used",
      message: `Use the latest ARM common-types version '${latestVersion}' instead of 'v3'.`,
    });
});

it("does not emit when a version enum member overrides an older namespace to the latest common-types version", async () => {
  await tester
    .expect(
      `
        ${serviceHeader("v3", latestVersion)}

        @@armCommonTypesVersion(
          Versions.v2024_01_01,
          Azure.ResourceManager.CommonTypes.Versions.${latestVersion}
        );

        ${widgetResource}
      `,
    )
    .toBeValid();
});

it("emits diagnostic when a latest-version service uses a legacy common parameter", async () => {
  await tester
    .expect(
      `
        ${serviceHeader(latestVersion)}

        @route("/subscriptions/{subscriptionId}/providers/Microsoft.TestService")
        interface Operations {
          @get
          @route("/locations/{location}/widgets")
          listByLocation(
            ...SubscriptionIdParameter,
            ...LocationParameter,
          ): {
            @body body: WidgetListResult;
          };
        }

        model WidgetListResult {
          value: Widget[];
        }

        model Widget {
          name: string;
        }
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/latest-version-of-common-types-must-be-used",
      message: `This API version already selects the latest ARM common-types version '${latestVersion}', but the common-type parameter 'LocationParameter' resolves to 'types.json' version 'v5'. Replace the TypeSpec usage that produces this legacy reference with a common type supported in '${latestVersion}'.`,
    });
});

it("emits diagnostic when a latest-version service uses a legacy common model", async () => {
  await tester
    .expect(
      `
        ${serviceHeader(latestVersion)}

        model Widget is TrackedResource<WidgetProperties> {
          ...Azure.ResourceManager.Legacy.ManagedServiceIdentityV4Property;

          @key("widgetName")
          @segment("widgets")
          @doc("The name of the widget")
          @path
          @pattern("^[a-zA-Z0-9_-]+$")
          name: string;
        }

        @doc("Widget resource properties.")
        model WidgetProperties {
          @doc("Widget description.")
          description?: string;
        }

        interface Operations extends Azure.ResourceManager.Operations {}

        @armResourceOperations
        interface Widgets {
          get is ArmResourceRead<Widget>;
          createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
        }
      `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-resource-manager/latest-version-of-common-types-must-be-used",
        message: `This API version already selects the latest ARM common-types version '${latestVersion}', but the common-type definition 'ManagedServiceIdentity' resolves to 'managedidentity.json' version 'v4'. Replace the TypeSpec usage that produces this legacy reference with a common type supported in '${latestVersion}'.`,
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/latest-version-of-common-types-must-be-used",
        message: `This API version already selects the latest ARM common-types version '${latestVersion}', but the common-type definition 'ManagedServiceIdentity' resolves to 'managedidentity.json' version 'v4'. Replace the TypeSpec usage that produces this legacy reference with a common type supported in '${latestVersion}'.`,
      },
    ]);
});

it("reports a versioned legacy property only for the projected API version that contains it", async () => {
  await tester
    .expect(
      `
        ${serviceHeader(
          latestVersion,
          latestVersion,
          `
            @useDependency(Azure.ResourceManager.CommonTypes.Versions.${latestVersion})
            v2025_01_01: "2025-01-01",
          `,
        )}

        model IdentityResult {
          @added(Versions.v2025_01_01)
          identity?: Azure.ResourceManager.Legacy.ManagedServiceIdentityV4;
        }

        @route("/identity")
        @get
        op getIdentity(): IdentityResult;
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/latest-version-of-common-types-must-be-used",
      message: `This API version already selects the latest ARM common-types version '${latestVersion}', but the common-type definition 'ManagedServiceIdentity' resolves to 'managedidentity.json' version 'v4'. Replace the TypeSpec usage that produces this legacy reference with a common type supported in '${latestVersion}'.`,
    });
});

it("reports each operation that emits the same legacy common type reference", async () => {
  await tester
    .expect(
      `
        ${serviceHeader(latestVersion)}

        @route("/first")
        @get
        op getFirst(): Azure.ResourceManager.Legacy.ManagedServiceIdentityV4;

        @route("/second")
        @get
        op getSecond(): Azure.ResourceManager.Legacy.ManagedServiceIdentityV4;
      `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-resource-manager/latest-version-of-common-types-must-be-used",
        message: `This API version already selects the latest ARM common-types version '${latestVersion}', but the common-type definition 'ManagedServiceIdentity' resolves to 'managedidentity.json' version 'v4'. Replace the TypeSpec usage that produces this legacy reference with a common type supported in '${latestVersion}'.`,
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/latest-version-of-common-types-must-be-used",
        message: `This API version already selects the latest ARM common-types version '${latestVersion}', but the common-type definition 'ManagedServiceIdentity' resolves to 'managedidentity.json' version 'v4'. Replace the TypeSpec usage that produces this legacy reference with a common type supported in '${latestVersion}'.`,
      },
    ]);
});

it("does not report legacy common types excluded by request or response payload visibility", async () => {
  await tester
    .expect(
      `
        ${serviceHeader(latestVersion)}

        model UpdateRequest {
          @visibility(Lifecycle.Read)
          readOnlyIdentity?: Azure.ResourceManager.Legacy.ManagedServiceIdentityV4;

          records?: Record<RecordValue>;
          description?: string;
        }

        model RecordValue {
          @header
          legacyHeader?: Azure.ResourceManager.Legacy.ManagedServiceIdentityV4;

          description?: string;
        }

        model ReadResponse {
          @visibility(Lifecycle.Delete)
          deleteOnlyIdentity?: Azure.ResourceManager.Legacy.ManagedServiceIdentityV4;

          description?: string;
        }

        @route("/widgets/{widgetName}")
        interface Widgets {
          @patch
          update(@path widgetName: string, @bodyRoot body: UpdateRequest): void;

          @get
          read(@path widgetName: string): ReadResponse;
        }
      `,
    )
    .toBeValid();
});
