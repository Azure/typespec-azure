import { Tester } from "#test/tester.js";
import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { noTenantLevelApisRule } from "../../src/rules/no-tenant-level-apis.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    noTenantLevelApisRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it("reports a tenant-scoped resource create-or-update PUT", async () => {
  await expectArmOperation(`
    @put
    @route("/providers/Microsoft.Test/configurations/{configName}")
    op createOrUpdate(@path configName: string): void;
  `).toEmitDiagnostics({
    code: "@azure-tools/typespec-azure-resource-manager/no-tenant-level-apis",
    message:
      "Operation 'createOrUpdate' defines a tenant-level ARM API. Prefer a subscription- or resource-group-level API instead.",
  });
});

it("reports a custom tenant-level PUT", async () => {
  await expectArmOperation(`
    @put
    @route("/providers/Microsoft.Test/configurations/{configName}/refresh")
    op refreshTenantConfig(@path configName: string): void;
  `).toEmitDiagnostics({
    code: "@azure-tools/typespec-azure-resource-manager/no-tenant-level-apis",
  });
});

it("reports every tenant-level PUT", async () => {
  await expectArmOperation(`
    @put
    @route("/providers/Microsoft.Test/configurations/{configName}")
    op createOrUpdate(@path configName: string): void;

    @put
    @route("/providers/Microsoft.Test/settings/{settingName}")
    op updateSetting(@path settingName: string): void;
  `).toEmitDiagnostics([
    {
      code: "@azure-tools/typespec-azure-resource-manager/no-tenant-level-apis",
      message:
        "Operation 'createOrUpdate' defines a tenant-level ARM API. Prefer a subscription- or resource-group-level API instead.",
    },
    {
      code: "@azure-tools/typespec-azure-resource-manager/no-tenant-level-apis",
      message:
        "Operation 'updateSetting' defines a tenant-level ARM API. Prefer a subscription- or resource-group-level API instead.",
    },
  ]);
});

it("reports a management-group extension PUT whose path begins with /providers", async () => {
  await expectArmOperation(`
    @put
    @route("/providers/Microsoft.Management/managementGroups/{managementGroupName}/providers/Microsoft.Test/extensions/{extensionName}")
    op createOrUpdate(
      @path managementGroupName: string,
      @path extensionName: string,
    ): void;
  `).toEmitDiagnostics({
    code: "@azure-tools/typespec-azure-resource-manager/no-tenant-level-apis",
  });
});

it("reports a PUT at the exact /providers path", async () => {
  await expectArmOperation(`
    @put
    @route("/providers")
    op update(): void;
  `).toEmitDiagnostics({
    code: "@azure-tools/typespec-azure-resource-manager/no-tenant-level-apis",
  });
});

it("allows a PUT whose path ends with /operations", async () => {
  await expectArmOperation(`
    @put
    @route("/providers/Microsoft.Test/operations")
    op updateOperations(): void;
  `).toBeValid();
});

it("allows a data-plane PUT whose path begins with /providers", async () => {
  await tester
    .expect(
      `
      @service(#{ title: "Test service" })
      namespace TestService;

      @put
      @route("/providers/Microsoft.Test/widgets/{widgetName}")
      op createOrReplace(@path widgetName: string): void;
    `,
    )
    .toBeValid();
});

it("allows a subscription-scoped resource PUT", async () => {
  await expectArmOperation(`
    @put
    @route("/subscriptions/{subscriptionId}/providers/Microsoft.Test/configurations/{configName}")
    op createOrUpdate(
      @path subscriptionId: string,
      @path configName: string,
    ): void;
  `).toBeValid();
});

it("allows an extension resource PUT under a scope path", async () => {
  await expectArmOperation(`
    @put
    @route("/{resourceUri}/providers/Microsoft.Test/configurations/{configName}")
    op createOrUpdate(
      @path resourceUri: string,
      @path configName: string,
    ): void;
  `).toBeValid();
});

it("allows a tenant-scoped resource without a PUT operation", async () => {
  await expectArmOperation(`
    @get
    @route("/providers/Microsoft.Test/configurations/{configName}")
    op get(@path configName: string): void;
  `).toBeValid();
});

function expectArmOperation(operation: string) {
  return tester.expect(`
    @armProviderNamespace
    @service(#{ title: "Test service" })
    namespace Microsoft.Test;

    ${operation}
  `);
}
