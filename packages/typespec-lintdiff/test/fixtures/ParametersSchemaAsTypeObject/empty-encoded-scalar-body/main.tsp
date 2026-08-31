// Test: empty-encoded-scalar-body
// Violation: none. An empty encoding does not add an emitted schema type.

import "../../lib/imports.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
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
  @doc("Resource provisioning state")
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

@doc("An unbased scalar with an empty encoding.")
@encode("", string)
scalar EmptyEncodedRequest;

@secret
scalar SecretWire;

@encode("", SecretWire)
scalar SecretEncodedRequest extends string;

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
  delete is ArmResourceDeleteWithoutOkAsync<Widget>;

  @post
  @armResourceAction(Widget)
  submitEmptyEncoding(...ResourceInstanceParameters<Widget>, @body body: EmptyEncodedRequest):
    | ArmResponse<Widget>
    | ErrorResponse;

  @post
  @armResourceAction(Widget)
  submitSecretEncoding(...ResourceInstanceParameters<Widget>, @body body: SecretEncodedRequest):
    | ArmResponse<Widget>
    | ErrorResponse;
}
