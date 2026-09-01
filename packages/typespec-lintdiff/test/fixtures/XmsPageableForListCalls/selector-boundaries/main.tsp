import "../../lib/imports.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
@versioned(Versions)
namespace Microsoft.TestService;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v5)
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  v2024_01_01: "2024-01-01",
}

model Widget is ProxyResource<WidgetProperties> {
  @key("widgetName")
  @segment("widgets")
  @path
  name: string;
}

model WidgetProperties {
  description?: string;
}

model ProviderPermissionListResult {
  value: string[];
}

interface Operations {}

interface ProviderOperations {
  @route("/subscriptions/{subscriptionId}/providers/{resourceProviderNamespace}/providerPermissions")
  @get
  @armResourceList(Widget)
  providerPermissions(
    @path subscriptionId: string,
    @path resourceProviderNamespace: string,
    ...ApiVersionParameter,
  ): ArmResponse<ProviderPermissionListResult> | ErrorResponse;
}

interface GenericLists<Resource extends TypeSpec.Reflection.Model> {
  @route("/providers/Microsoft.TestService/genericItems")
  @get
  @armResourceList(Resource)
  list<Response extends {}>(...ApiVersionParameter): ArmResponse<Response> | ErrorResponse;
}
