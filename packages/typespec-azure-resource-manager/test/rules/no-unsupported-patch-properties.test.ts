import { Tester } from "#test/tester.js";
import {
  createLinterRuleTester,
  type LinterRuleTester,
  type TesterInstance,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { noUnsupportedPatchPropertiesRule } from "../../src/rules/no-unsupported-patch-properties.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    noUnsupportedPatchPropertiesRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it("reports writable id, name, and type properties", async () => {
  await tester
    .expect(
      `
        @armProviderNamespace namespace Microsoft.Test;

        model WidgetPatch {
          id?: string;
          name?: string;
          type?: string;
        }

        @route("/widgets/{widgetName}") @patch
        op update(@path widgetName: string, @body body: WidgetPatch): void;
      `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-resource-manager/no-unsupported-patch-properties",
        message:
          "PATCH request body property 'id' is not patchable and should be removed or made read-only or immutable.",
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/no-unsupported-patch-properties",
        message:
          "PATCH request body property 'name' is not patchable and should be removed or made read-only or immutable.",
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/no-unsupported-patch-properties",
        message:
          "PATCH request body property 'type' is not patchable and should be removed or made read-only or immutable.",
      },
    ]);
});

it("reports writable location and properties.provisioningState on a nullable body", async () => {
  await tester
    .expect(
      `
        @armProviderNamespace namespace Microsoft.Test;

        model WidgetPatch {
          location?: string;
          properties?: WidgetPatchProperties;
        }

        model WidgetPatchProperties {
          provisioningState?: string;
        }

        @route("/widgets/{widgetName}") @patch
        op update(@path widgetName: string, @body body: WidgetPatch | null): void;
      `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-resource-manager/no-unsupported-patch-properties",
        message:
          "PATCH request body property 'location' is not patchable and should be removed or made read-only or immutable.",
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/no-unsupported-patch-properties",
        message:
          "PATCH request body property 'properties.provisioningState' is not patchable and should be removed or made read-only or immutable.",
      },
    ]);
});

it("reports inherited properties by their encoded JSON names", async () => {
  await tester
    .expect(
      `
        @armProviderNamespace namespace Microsoft.Test;

        model PatchBase {
          @encodedName("application/json", "name")
          resourceName?: string;
        }

        model WidgetPatch extends PatchBase {
          @encodedName("application/json", "location")
          region?: string;
          properties?: WidgetPatchProperties;
        }

        model PropertiesBase {
          @encodedName("application/json", "provisioningState")
          state?: string;
        }

        model WidgetPatchProperties extends PropertiesBase {}

        @route("/widgets/{widgetName}") @patch
        op update(@path widgetName: string, @body body: WidgetPatch): void;
      `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-resource-manager/no-unsupported-patch-properties",
        message:
          "PATCH request body property 'location' is not patchable and should be removed or made read-only or immutable.",
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/no-unsupported-patch-properties",
        message:
          "PATCH request body property 'properties.provisioningState' is not patchable and should be removed or made read-only or immutable.",
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/no-unsupported-patch-properties",
        message:
          "PATCH request body property 'name' is not patchable and should be removed or made read-only or immutable.",
      },
    ]);
});

it("accepts read-only and immutable reserved properties", async () => {
  await tester
    .expect(
      `
        @armProviderNamespace namespace Microsoft.Test;

        model WidgetPatch {
          @visibility(Lifecycle.Read) id?: string;
          @visibility(Lifecycle.Read) name?: string;
          @visibility(Lifecycle.Read) type?: string;
          @visibility(Lifecycle.Read, Lifecycle.Create) location?: string;
          properties?: WidgetPatchProperties;
        }

        model WidgetPatchProperties {
          @visibility(Lifecycle.Read) provisioningState?: string;
        }

        @route("/widgets/{widgetName}") @patch
        op update(@path widgetName: string, @body body: WidgetPatch): void;
      `,
    )
    .toBeValid();
});

it("accepts a read-only referenced provisioning state", async () => {
  await tester
    .expect(
      `
        @armProviderNamespace namespace Microsoft.Test;

        model WidgetPatch {
          properties?: WidgetPatchProperties;
        }

        model WidgetPatchProperties {
          @visibility(Lifecycle.Read)
          provisioningState?: ResourceProvisioningState;
        }

        @route("/widgets/{widgetName}") @patch
        op update(@path widgetName: string, @body body: WidgetPatch): void;
      `,
    )
    .toBeValid();
});

it("accepts scalar and multi-model-union bodies", async () => {
  await tester
    .expect(
      `
        @armProviderNamespace namespace Microsoft.Test;

        model FirstPatchBody {
          id?: string;
        }

        model SecondPatchBody {
          name?: string;
        }

        @route("/widgets/{widgetName}") @patch
        op updateScalar(@path widgetName: string, @body body: string): void;

        @route("/other-widgets/{widgetName}") @patch
        op updateUnion(
          @path widgetName: string,
          @body body: FirstPatchBody | SecondPatchBody
        ): void;
      `,
    )
    .toBeValid();
});
