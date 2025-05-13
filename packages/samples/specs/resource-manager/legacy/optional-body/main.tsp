import "@typespec/rest";
import "@typespec/http";
import "@azure-tools/typespec-azure-resource-manager";
import "@typespec/versioning";

using Azure.ResourceManager;
using Versioning;
using Http;

@armProviderNamespace
@versioned(Versions)
namespace Microsoft.OptionalBody;
interface Operations extends Azure.ResourceManager.Operations {}

enum Versions {
  @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
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
  get is ArmResourceRead<Widget>;
  createOrReplace is ArmResourceCreateOrReplaceAsync<Widget>;
  update is Azure.ResourceManager.Legacy.ArmCustomPatchAsync<
    Widget,
    Foundations.ResourceUpdateModel<Widget, WidgetProperties>,
    RequestBody = {
      /** The PATCH request body */
      @body body?: Foundations.ResourceUpdateModel<Widget, WidgetProperties>;
    }
  >;
  delete is ArmResourceDeleteWithoutOkAsync<Widget>;
  list is ArmResourceListByParent<Widget>;
}
