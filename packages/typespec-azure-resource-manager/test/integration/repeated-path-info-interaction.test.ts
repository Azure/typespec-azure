import { getSourceLocation } from "@typespec/compiler";
import { expectDiagnostics } from "@typespec/compiler/testing";
import { it } from "vitest";
import { Tester } from "../tester.js";

it.each(["widgetName", "identity"])(
  "distinguishes envelope duplication from URI duplication with @key(%s)",
  async (parameterName) => {
    const [{ widgetName, identity }, diagnostics] = await Tester.compileAndDiagnose(
      `
        @armProviderNamespace
        namespace Microsoft.Contoso;
        model Widget is TrackedResource<WidgetProperties> {
          @key("${parameterName}") @segment("widgets") @path name: string;
          ...ManagedServiceIdentityProperty;
        }
        model WidgetProperties {
          /*widgetName*/widgetName?: string;
          /*identity*/identity?: string;
        }
        @armResourceOperations
        interface Widgets {
          createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;
        }
      `,
      {
        compilerOptions: {
          linterRuleSet: {
            enable: {
              "@azure-tools/typespec-azure-resource-manager/arm-resource-duplicate-property": true,
              "@azure-tools/typespec-azure-resource-manager/no-repeated-path-info": true,
            },
          },
        },
      },
    );
    const envelopeLocation = getSourceLocation(identity);
    const uriLocation = getSourceLocation(parameterName === "widgetName" ? widgetName : identity);
    expectDiagnostics(diagnostics, [
      {
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-duplicate-property",
        severity: "warning",
        message:
          'Duplicate property "identity" found in the resource envelope and resource properties.  Please do not duplicate envelope properties in resource properties.',
        pos: envelopeLocation.pos,
        end: envelopeLocation.end,
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/no-repeated-path-info",
        severity: "warning",
        message: `Request body property '${parameterName}' repeats information already carried in the path or query.`,
        pos: uriLocation.pos,
        end: uriLocation.end,
      },
    ]);
  },
);
