import { Tester } from "#test/tester.js";
import {
  LinterRuleTester,
  TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { armResourceActionNoSegmentRule } from "../../src/rules/arm-resource-action-no-segment.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
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
    namespace Microsoft.Contoso;

    @Azure.ResourceManager.tenantResource
    model Widget is ProxyResource<WidgetProperties> {
      @key("widgetName")
      @segment("widgets")
      @path
      @visibility(Lifecycle.Read)
      name: string;
    }

    model WidgetProperties {
      color: string;
    }

    @armResourceOperations
    interface Widgets extends TenantResourceOperations<Widget, WidgetProperties> {
      @test
      @autoRoute
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
