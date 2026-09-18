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

@doc("Update widget file contents.")
@route("/subscriptions/{subscriptionId}/providers/Microsoft.TestService/widgets/{widgetName}")
@patch
op update(
  @doc("Subscription identifier.") @path subscriptionId: string,
  @doc("Widget identifier.") @path widgetName: string,
  @doc("API version.") @query("api-version") apiVersion: string,
  @doc("The replacement file.") @bodyRoot body: File,
): void;
