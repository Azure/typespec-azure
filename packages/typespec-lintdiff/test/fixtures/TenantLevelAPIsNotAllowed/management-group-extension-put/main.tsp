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
  @doc("Create or update a management-group extension.")
  @put
  @route("/providers/Microsoft.Management/managementGroups/{managementGroupName}/providers/Microsoft.TestService/extensions/{extensionName}")
  createOrUpdate(
    @doc("The management group name.") @path managementGroupName: string,
    @doc("The extension name.") @path extensionName: string,
    @body body: ExtensionResource,
    ...ApiVersionParameter,
  ): ArmResponse<ExtensionResource> | ErrorResponse;
}
