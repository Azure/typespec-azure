import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { armNoRecordRule } from "../../src/rules/arm-no-record.js";
import { createAzureResourceManagerTestRunner } from "../test-host.js";

describe("typespec-azure-resource-manager: ARM no-record rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureResourceManagerTestRunner();
    tester = createLinterRuleTester(
      runner,
      armNoRecordRule,
      "@azure-tools/typespec-azure-resource-manager"
    );
  });

  it("emits diagnostic when a model property uses Record type", async () => {
    await tester
      .expect(
        `
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Contoso;

      @Azure.ResourceManager.tenantResource
      model Widget is ProxyResource<WidgetProperties> {
        @key("widgetName")
        @segment("widgets")
        @path
        @visibility("read")
        name: string;

        props: Record<string>;
      }

      model WidgetProperties {}
      `
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-no-record",
      });
  });

  it("emits diagnostic when a model extends Record type", async () => {
    await tester
      .expect(
        `
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Contoso;

      @Azure.ResourceManager.tenantResource
      model Widget is ProxyResource<WidgetProperties> {
        @key("widgetName")
        @segment("widgets")
        @path
        @visibility("read")
        name: string;
      }

      model WidgetProperties extends Record<string> {}
      `
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-no-record",
      });
  });

  it("emits diagnostic when a model is Record type", async () => {
    await tester
      .expect(
        `
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Contoso;

      @Azure.ResourceManager.tenantResource
      model Widget is ProxyResource<WidgetProperties> {
        @key("widgetName")
        @segment("widgets")
        @path
        @visibility("read")
        name: string;
      }

      model WidgetProperties is Record<string>;
      `
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-no-record",
      });
  });
});
