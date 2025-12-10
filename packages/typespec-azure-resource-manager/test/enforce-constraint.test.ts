import { expectDiagnosticEmpty, expectDiagnostics } from "@typespec/compiler/testing";
import { it } from "vitest";
import { Tester } from "./tester.js";

it("emits no error when template param extends from Resource", async () => {
  const diagnostics = await Tester.diagnose(`
      @armProviderNamespace
      namespace Microsoft.Contoso;

      model Widget is ProxyResource<WidgetProperties> {
         ...ResourceNameParameter<Widget>;
         ...ExtendedLocationProperty;
      }

      model WidgetProperties {
         size: int32;
      }
      
      model CustomResource extends Foundations.Resource {};

      interface Widgets {
        create is ArmResourceCreateOrReplaceSync<Widget>;
        delete is ArmResourceCreateOrReplaceSync<CustomResource>;
      }
  `);
  expectDiagnosticEmpty(diagnostics);
});

it("emits error if template param is not extended from Resource", async () => {
  const diagnostics = await Tester.diagnose(`
      @armProviderNamespace
      namespace Microsoft.Contoso;
 
      model Widget {
        @visibility(Lifecycle.Read)
        id?: string;
      
        @visibility(Lifecycle.Read)
        name?: string;
      
        @visibility(Lifecycle.Read)
        type?: string;
      
        @visibility(Lifecycle.Read)
        systemData?: Foundations.SystemData;

        properties? : WidgetProperties;
      }

      model WidgetProperties {
         size: int32;
      }

      model CustomResource is Foundations.Resource {};

      interface Widgets {
        create is ArmResourceCreateOrReplaceSync<Widget>;
        delete is ArmResourceCreateOrReplaceSync<CustomResource>;
      }
  `);
  expectDiagnostics(diagnostics, [
    {
      code: "@azure-tools/typespec-azure-resource-manager/template-type-constraint-no-met",
      message:
        'The template parameter "Widget" for "ArmResourceCreateOrReplaceSync" does not extend the constraint type "Resource". Please use the "TrackedResource", "ProxyResource", or "ExtensionResource" template to define the resource.',
    },
    {
      code: "@azure-tools/typespec-azure-resource-manager/template-type-constraint-no-met",
      message:
        'The template parameter "Widget" for "create" does not extend the constraint type "Resource". Please use the "TrackedResource", "ProxyResource", or "ExtensionResource" template to define the resource.',
    },
    {
      code: "@azure-tools/typespec-azure-resource-manager/template-type-constraint-no-met",
      message:
        'The template parameter "CustomResource" for "ArmResourceCreateOrReplaceSync" does not extend the constraint type "Resource". Please use the "TrackedResource", "ProxyResource", or "ExtensionResource" template to define the resource.',
    },
    {
      code: "@azure-tools/typespec-azure-resource-manager/template-type-constraint-no-met",
      message:
        'The template parameter "CustomResource" for "delete" does not extend the constraint type "Resource". Please use the "TrackedResource", "ProxyResource", or "ExtensionResource" template to define the resource.',
    },
  ]);
});

it("emits no error when template extends from a `@Azure.ResourceManager.Legacy.customAzureResource` Resource", async () => {
  const diagnostics = await Tester.diagnose(`
    @armProviderNamespace
    namespace Microsoft.Contoso;

    model CustomResource is CustomAzureResource;

    @Azure.ResourceManager.Legacy.customAzureResource
    model CustomAzureResource {
      name: string;
      type: string;
    }

    interface Widgets {
      delete is ArmResourceCreateOrReplaceSync<CustomResource>;
    }
  `);
  expectDiagnosticEmpty(diagnostics);
});

it("emits no error when template extends from a `@Azure.ResourceManager.Legacy.customAzureResource` Resource when using Legacy Operations", async () => {
  const diagnostics = await Tester.diagnose(`
    @armProviderNamespace
    namespace Microsoft.Contoso;

    model CustomResource is CustomAzureResource;

    @Azure.ResourceManager.Legacy.customAzureResource
    model CustomAzureResource {
      name: string;
      type: string;
    }

    interface WidgetOps
  extends Azure.ResourceManager.Legacy.LegacyOperations<
      {
        ...ResourceParentParameters<
          CustomResource,
          Azure.ResourceManager.Foundations.DefaultBaseParameters<CustomResource>
        >,
      },
      {
        @visibility(Lifecycle.Read)
        @path
        @key("widgetName")
        @segment("widgets")
        name: string,
      },
      ErrorResponse
    > {}

    interface Widgets {
      create is WidgetOps.CreateOrUpdateAsync<CustomResource>;
    }
  `);
  expectDiagnosticEmpty(diagnostics);
});

it("emits error when template is extended from Resource or from a `@Azure.ResourceManager.Legacy.customAzureResource` Resource", async () => {
  const diagnostics = await Tester.diagnose(`
    @armProviderNamespace
    namespace Microsoft.Contoso;

    model CustomResource extends CustomBase {
       ...ResourceNameParameter<CustomResource>;
    };

    model CustomBase {
      name: string;
    }

    interface Widgets {
      delete is ArmResourceCreateOrReplaceSync<CustomResource>;
    }
  `);
  expectDiagnostics(diagnostics, [
    { code: "@azure-tools/typespec-azure-resource-manager/template-type-constraint-no-met" },
    { code: "@azure-tools/typespec-azure-resource-manager/template-type-constraint-no-met" },
  ]);
});
it("emits error when renaming a parameter to an existing parameter name", async () => {
  const diagnostics = await Tester.diagnose(`
    @armProviderNamespace
    namespace Microsoft.Contoso;

    model CustomResource is ProxyResource<CustomProperties> {
       ...ResourceNameParameter<CustomResource>;
    };

    model CustomProperties {
      flavor: string;
    }

    interface Widgets {
      @Azure.ResourceManager.Legacy.renamePathParameter("subscriptionId", "customResourceName")
      delete is ArmResourceCreateOrReplaceSync<CustomResource>;
    }
    `);
  expectDiagnostics(diagnostics, [
    {
      code: "@azure-tools/typespec-azure-resource-manager/invalid-parameter-rename",
    },
  ]);
});

it("emits warning when renaming a non-existent parameter", async () => {
  const diagnostics = await Tester.diagnose(`
      @armProviderNamespace
      
      namespace Microsoft.Contoso;

       model CustomResource is ProxyResource<CustomProperties> {
         ...ResourceNameParameter<CustomResource>;
       };

      model CustomProperties {
        flavor: string;
      }

      interface Widgets {
        @Azure.ResourceManager.Legacy.renamePathParameter("foo", "fooName")
        create is ArmResourceCreateOrReplaceSync<CustomResource>;
      }
    `);
  expectDiagnostics(diagnostics, [
    {
      code: "@azure-tools/typespec-azure-resource-manager/invalid-parameter-rename",
    },
  ]);
});
it("emits a warning when renaming a non-path parameter", async () => {
  const diagnostics = await Tester.diagnose(`
      @armProviderNamespace
      
      namespace Microsoft.Contoso;

       model CustomResource is ProxyResource<CustomProperties> {
         ...ResourceNameParameter<CustomResource>;
       };

      model CustomProperties {
        flavor: string;
      }

      interface Widgets {
        @Azure.ResourceManager.Legacy.renamePathParameter("resource", "fooName")
        create is ArmResourceCreateOrReplaceSync<CustomResource>;
      }
    `);
  expectDiagnostics(diagnostics, [
    {
      code: "@azure-tools/typespec-azure-resource-manager/invalid-parameter-rename",
    },
  ]);
});
it("emits no warning when renaming a parameter twice", async () => {
  const diagnostics = await Tester.diagnose(`
      @armProviderNamespace
      
      namespace Microsoft.Contoso;

       model CustomResource is ProxyResource<CustomProperties> {
         ...ResourceNameParameter<CustomResource>;
       };

      model CustomProperties {
        flavor: string;
      }

      interface Widgets {
        @Azure.ResourceManager.Legacy.renamePathParameter("customResourceName", "customName")
        @Azure.ResourceManager.Legacy.renamePathParameter("customResourceName", "customName")
        create is ArmResourceCreateOrReplaceSync<CustomResource>;
      }
    `);
  expectDiagnosticEmpty(diagnostics);
});
it("emits no warning when renaming a parameter", async () => {
  const diagnostics = await Tester.diagnose(`
      @armProviderNamespace
      
      namespace Microsoft.Contoso;

       model CustomResource is ProxyResource<CustomProperties> {
         ...ResourceNameParameter<CustomResource>;
       };

      model CustomProperties {
        flavor: string;
      }

      interface Widgets {
        @Azure.ResourceManager.Legacy.renamePathParameter("customResourceName", "customResourcesName")
        create is ArmResourceCreateOrReplaceSync<CustomResource>;
      }
    `);
  expectDiagnosticEmpty(diagnostics);
});
