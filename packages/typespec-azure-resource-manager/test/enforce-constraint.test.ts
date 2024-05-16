import { expectDiagnosticEmpty, expectDiagnostics } from "@typespec/compiler/testing";
import { describe, it } from "vitest";
import { checkFor } from "./test-host.js";

describe("typespec-azure-resource-manager: @enforceConstraint", () => {
  it("emits no error when template param extends from Resource", async () => {
    const { diagnostics } = await checkFor(`
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Contoso;

      @doc("Widget resource")
      model Widget is ProxyResource<WidgetProperties> {
         ...ResourceNameParameter<Widget>;
         ...ExtendedLocationProperty;
      }

      @doc("The properties of a widget")
      model WidgetProperties {
         size: int32;
      }
      
      @doc("Direct extended resource")
      model CustomResource extends Foundations.Resource {};

      interface Widgets {
        create is ArmResourceCreateOrReplaceSync<Widget>;
        delete is ArmResourceCreateOrReplaceSync<CustomResource>;
      }
  `);
    expectDiagnosticEmpty(diagnostics);
  });

  it("emits error if template param is not extended from Resource", async () => {
    const { diagnostics } = await checkFor(`
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Contoso;
 
      @doc("Widget resource")
      model Widget {
        @doc("Fully qualified resource ID for the resource. Ex - /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{resourceProviderNamespace}/{resourceType}/{resourceName}")
        @visibility("read")
        id?: string;
      
        @doc("The name of the resource")
        @visibility("read")
        name?: string;
      
        @doc("The type of the resource.")
        @visibility("read")
        type?: string;
      
        @doc("Azure Resource Manager metadata containing createdBy and modifiedBy information.")
        @visibility("read")
        systemData?: Foundations.SystemData;

        properties? : WidgetProperties;
      }

      @doc("The properties of a widget")
      model WidgetProperties {
         size: int32;
      }

      @doc("Custom Mix in resource")
      model CustomResource is Foundations.Resource {};

      interface Widgets {
        create is ArmResourceCreateOrReplaceSync<Widget>;
        delete is ArmResourceCreateOrReplaceSync<CustomResource>;
      }
  `);
    expectDiagnostics(diagnostics, [
      {
        code: "@azure-tools/typespec-azure-resource-manager/template-type-constraint-no-met",
        message: `The template parameter "Widget" for "ArmResourceCreateOrReplaceSync" does not extend the constraint type "Resource". Please use the "TrackedResource", "ProxyResource", or "ExtensionResource" template to define the resource.`,
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/template-type-constraint-no-met",
        message: `The template parameter "Widget" for "create" does not extend the constraint type "Resource". Please use the "TrackedResource", "ProxyResource", or "ExtensionResource" template to define the resource.`,
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/template-type-constraint-no-met",
        message: `The template parameter "CustomResource" for "ArmResourceCreateOrReplaceSync" does not extend the constraint type "Resource". Please use the "TrackedResource", "ProxyResource", or "ExtensionResource" template to define the resource.`,
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/template-type-constraint-no-met",
        message: `The template parameter "CustomResource" for "delete" does not extend the constraint type "Resource". Please use the "TrackedResource", "ProxyResource", or "ExtensionResource" template to define the resource.`,
      },
    ]);
  });
});
