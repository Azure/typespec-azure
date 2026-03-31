import "@typespec/rest";
import "@typespec/http";
import "@azure-tools/typespec-azure-resource-manager";
import "@typespec/versioning";

using Azure.ResourceManager;
using Versioning;

@armProviderNamespace
@versioned(Versions)
namespace Microsoft.RenamedOperations;
interface Operations extends Azure.ResourceManager.Operations {}

enum Versions {
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  `2025-01-01-preview`,
}
/** The resource-specific properties of a Widget */
model WidgetProperties {
  /** Required property */
  property1: string;

  /** optional Property */
  property2: int32;

  ...DefaultProvisioningStateProperty;
}

model Widget is TrackedResource<WidgetProperties> {
  ...ResourceNameParameter<Widget>;
}

@armResourceOperations
interface Widgets {
  /** Renaming: last path parameter should be 'widgetsName' */
  #suppress "@azure-tools/typespec-azure-core/no-legacy-usage" ""
  @Azure.ResourceManager.Legacy.renamePathParameter("widgetName", "widgetsName")
  get is ArmResourceRead<Widget>;
  /** No renaming: last path parameter should be 'widgetName' */
  #suppress "@azure-tools/typespec-azure-core/no-legacy-usage" ""
  #suppress "@azure-tools/typespec-azure-resource-manager/invalid-parameter-rename"
  @Azure.ResourceManager.Legacy.renamePathParameter("non-existent-name", "widgetsName")
  createOrReplace is ArmResourceCreateOrReplaceAsync<Widget>;
  /** Renaming: last path parameter should be 'widgetsName' */
  #suppress "@azure-tools/typespec-azure-core/no-legacy-usage" ""
  @Azure.ResourceManager.Legacy.renamePathParameter("widgetName", "widgetsName")
  update is Azure.ResourceManager.Legacy.CustomPatchAsync<
    Widget,
    Foundations.ResourceUpdateModel<Widget, WidgetProperties>,
    OptionalRequestBody = true
  >;
  /** No renaming: last path parameter should be 'widgetName' */
  #suppress "@azure-tools/typespec-azure-core/no-legacy-usage" ""
  #suppress "@azure-tools/typespec-azure-resource-manager/invalid-parameter-rename"
  @Azure.ResourceManager.Legacy.renamePathParameter("widgetName", "resourceGroupName")
  delete is ArmResourceDeleteWithoutOkAsync<Widget>;
  list is ArmResourceListByParent<Widget>;
}
