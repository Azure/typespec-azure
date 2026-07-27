import "../../lib/imports.tsp";
using TypeSpec.Http; using TypeSpec.Rest; using TypeSpec.Versioning; using TypeSpec.OpenAPI; using Azure.ResourceManager;

@armProviderNamespace @service(#{ title: "Test Service" }) @versioned(Versions)
@armCommonTypesVersion(CommonTypes.Versions.v5)
namespace Microsoft.TestService;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v5)
  v2024_01_01: "2024-01-01",
}

model Widget is TrackedResource<WidgetProperties> {
  @key("widgetName") @segment("widgets") @doc("The name of the widget") @path
  @pattern("^[a-zA-Z0-9_-]+$")
  name: string;
}

@doc("Widget resource properties.")
model WidgetProperties {
  @doc("Description") description?: string;
  @doc("Resource provisioning state") @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

@doc("Accepted LRO response.")
model Accepted202 {
  @doc("Status code") @statusCode statusCode: 202;
  @doc("Location for polling") @header("Location") location?: string;
  @doc("Retry after seconds") @header("Retry-After") retryAfter?: int32;
}

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
  delete is ArmResourceDeleteWithoutOkAsync<Widget>;

  #suppress "@azure-tools/typespec-azure-resource-manager/arm-post-operation-response-codes" "LRO POST needs 202 response"
  #suppress "@azure-tools/typespec-azure-core/no-openapi" "Need x-ms-long-running-operation to test original-uri final-state-via"
  @extension("x-ms-long-running-operation", true)
  #suppress "@azure-tools/typespec-azure-core/no-openapi" "Need x-ms-long-running-operation-options to test original-uri"
  @extension("x-ms-long-running-operation-options", #{ `final-state-via`: "original-uri" })
  @doc("Restart widget")
  @route("restart")
  @post
  @armResourceAction(Widget)
  restart(...ResourceInstanceParameters<Widget>): Accepted202 | ErrorResponse;
}
