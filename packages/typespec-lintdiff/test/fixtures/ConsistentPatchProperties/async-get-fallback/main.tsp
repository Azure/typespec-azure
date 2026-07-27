import "../../lib/imports.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using TypeSpec.OpenAPI;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
@versioned(Versions)
@armCommonTypesVersion(CommonTypes.Versions.v6)
namespace Microsoft.TestService;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v6)
  v2024_01_01: "2024-01-01",
}

model Widget is ProxyResource<WidgetProperties> {
  @key("widgetName")
  @segment("widgets")
  @doc("The name of the widget")
  @path
  @pattern("^[a-zA-Z0-9_-]+$")
  name: string;
}

@doc("Widget resource properties.")
model WidgetProperties {
  @doc("Description")
  description?: string;

  @doc("Display name")
  displayName?: string;

  @doc("Resource provisioning state")
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

@doc("PATCH body for the Widget resource.")
model WidgetPatchBody {
  @doc("Resource properties to update")
  properties?: WidgetPatchProperties;
}

@doc("PATCH properties that match the resource model.")
model WidgetPatchProperties {
  @doc("Display name")
  displayName?: string;
}

@doc("Accepted LRO polling response.")
model Accepted202WithLocation {
  @doc("Status code")
  @statusCode statusCode: 202;
  @doc("Polling location")
  @header("Location") location?: string;
  @doc("Retry-after value")
  @header("Retry-After") retryAfter?: int32;
}

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
  delete is ArmResourceDeleteWithoutOkAsync<Widget>;
  listByResourceGroup is ArmResourceListByParent<Widget>;
  listBySubscription is ArmListBySubscription<Widget>;

  #suppress "@azure-tools/typespec-azure-core/no-openapi" "Need explicit LRO extensions for async PATCH."
  @extension("x-ms-long-running-operation", true)
  #suppress "@azure-tools/typespec-azure-core/no-openapi" "Need explicit LRO final-state metadata for async PATCH."
  @extension("x-ms-long-running-operation-options", #{ `final-state-via`: "location" })
  @doc("Update a Widget with an async PATCH body that matches the GET resource model.")
  @patch
  @armResourceUpdate(Widget)
  update(
    ...ResourceInstanceParameters<Widget>,
    @doc("The request body") @body body: WidgetPatchBody,
  ): Accepted202WithLocation | ErrorResponse;
}
