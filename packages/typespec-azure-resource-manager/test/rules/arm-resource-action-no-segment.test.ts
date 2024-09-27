import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { createAzureResourceManagerTestRunner } from "../test-host.js";

import { armResourceActionNoSegmentRule } from "../../src/rules/arm-resource-action-no-segment.js";

describe("typespec-azure-resource-manager: arm resource action no segment rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureResourceManagerTestRunner();
    tester = createLinterRuleTester(
      runner,
      armResourceActionNoSegmentRule,
      "@azure-tools/typespec-azure-resource-manager",
    );
  });

  it("Emits a warning for armResourceAction that uses an outdated pattern with `@segment`", async () => {
    await tester
      .expect(
        `
    @armProviderNamespace
    @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
    namespace Microsoft.Contoso;

    @Azure.ResourceManager.tenantResource
    model Widget is ProxyResource<WidgetProperties> {
      @doc("The name of the widget")
      @key("widgetName")
      @segment("widgets")
      @path
      @visibility("read")
      name: string;
    }

    @doc("The properties of a widget")
    model WidgetProperties {
      @doc("The color of the widget")
      color: string;
    }

    @armResourceOperations
    interface Widgets extends TenantResourceOperations<Widget, WidgetProperties> {
      @test
      @autoRoute
      @doc("Flip to the opposite of the current spin")
      @segment("wrongPattern")
      @post
      @armResourceAction(Widget)
      thisIsTheWrongPattern(...TenantInstanceParameters<Widget>): ArmResponse<Widget> | ErrorResponse;
    }
    `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-action-no-segment",
        message:
          "`@armResourceAction` should not be used with `@segment`. Instead, use `@action(...)` if you need to rename the action, or omit.",
      });
  });
});
