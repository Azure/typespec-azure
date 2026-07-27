import "../../lib/imports.tsp";

using TypeSpec.Http;
using TypeSpec.Versioning;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
@versioned(Versions)
@armCommonTypesVersion(CommonTypes.Versions.v5)
namespace Microsoft.TestService;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v5)
  v2024_01_01: "2024-01-01",
}

model ExtensionResource {
  @doc("The extension resource ID.")
  id?: string;
}

interface Operations extends Azure.ResourceManager.Operations {}

interface Extensions {
  @doc("Get extension")
  @get
  @route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Compute/virtualMachines/{vmName}/providers/Microsoft.TestService/extensions/{extensionName}")
  getExtension(
    ...CommonTypes.SubscriptionIdParameter,
    ...CommonTypes.ResourceGroupNameParameter,
    @doc("VM name") @path vmName: string,
    @doc("Extension name") @path extensionName: string,
    ...ApiVersionParameter,
  ): ArmResponse<ExtensionResource> | ErrorResponse;
}
