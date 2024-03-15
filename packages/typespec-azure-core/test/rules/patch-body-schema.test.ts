import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { patchBodySchemaRule } from "../../src/rules/patch-body-schema.js";
import { createAzureCoreTestRunner } from "../test-host.js";

let runner: BasicTestRunner;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await createAzureCoreTestRunner();
  tester = createLinterRuleTester(runner, patchBodySchemaRule, "@azure-tools/typespec-azure-core");
});

it("emits warning when PATCH body schema contains non-recommended patterns", async () => {
  await tester
    .expect(
      `      
      @resource("widgets")
      model Widget {
        @key("widgetName")
        @visibility("read")
        name: string;
        color: string;
        manufacturerId: string;
        description: string;
      }
      
      model WidgetPatch {
        color: string;
        manufacturerId?: string = "woo";
        @visibility("create")
        description?: string;
      }
      
      interface Widgets {
        @patch update is Azure.Core.Foundations.Operation<WidgetPatch, Widget>;
      }`
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-core/patch-body-schema-problem",
        message: `Operation 'update' has a PATCH body parameter 'color' that is required.`,
      },
      {
        code: "@azure-tools/typespec-azure-core/patch-body-schema-problem",
        message: `Operation 'update' has a PATCH body parameter 'manufacturerId' that has a default value.`,
      },
      {
        code: "@azure-tools/typespec-azure-core/patch-body-schema-problem",
        message: `Operation 'update' has a PATCH body parameter 'description' that has a "create" visibility.`,
      },
    ]);
});

it("does not emit warning when PATCH body schema conforms to guidelines", async () => {
  await tester
    .expect(
      `
      using Azure.Core.Traits;

      alias ServiceTraits = SupportsRepeatableRequests &
        SupportsConditionalRequests &
        SupportsClientRequestId;

      alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;
      
      @resource("widgets")
      model Widget {
        @key("widgetName")
        @visibility("read")
        name: string;
        color: string;
        manufacturerId: string;
        description: string;
      }
      
      interface Widgets {
        update is Operations.ResourceUpdate<Widget>;
      }`
    )
    .toBeValid();
});
