import "../../lib/imports.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using TypeSpec.OpenAPI;
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

model Widget is TrackedResource<WidgetProperties> {
  @key("widgetName")
  @segment("widgets")
  @doc("The name of the widget")
  @path
  @pattern("^[a-zA-Z0-9_-]+$")
  name: string;
}

@doc("Widget resource properties.")
model WidgetProperties {
  @doc("Description of the widget")
  description?: string;

  @doc("Resource provisioning state")
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

@doc("LRO delete accepted response")
model LroDeleteAccepted {
  @doc("Status code")
  @statusCode statusCode: 202;
  @doc("Resource deletion accepted.")
  @header("Location") location?: string;
  @doc("Retry after seconds")
  @header("Retry-After") retryAfter?: int32;
}

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;

  #suppress "@azure-tools/typespec-azure-core/no-openapi" "testing LRO delete"
  @doc("Delete a Widget")
  @delete
  @armResourceDelete(Widget)
  @extension("x-ms-long-running-operation", true)
  @extension("x-ms-long-running-operation-options", #{ `final-state-via`: "location" })
  delete(...ResourceInstanceParameters<Widget>): LroDeleteAccepted | ErrorResponse;
}
