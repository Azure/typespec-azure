// Test: encoded-model-property-body
// Violation: none. Reference resolution hides the sibling type added by the property encoding.

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

@doc("An unbased scalar used by an encoded body property.")
scalar PropertyRequest;

model EncodedWire {
  @encode("custom", int32)
  payload: PropertyRequest;

  @encode("custom", int32)
  choice: ObjectChoice;
}

union ObjectChoice {
  value: {
    value: string,
  },
}

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
  delete is ArmResourceDeleteWithoutOkAsync<Widget>;

  @post
  @armResourceAction(Widget)
  submitEncodedProperty(...ResourceInstanceParameters<Widget>, @body body: EncodedWire.payload):
    | ArmResponse<Widget>
    | ErrorResponse;

  @post
  @armResourceAction(Widget)
  submitNullableEncodedProperty(
    ...ResourceInstanceParameters<Widget>,
    @body body: EncodedWire.payload | null,
  ): ArmResponse<Widget> | ErrorResponse;

  @post
  @armResourceAction(Widget)
  submitNamedUnionEncodedProperty(
    ...ResourceInstanceParameters<Widget>,
    @body body: EncodedWire.choice,
  ): ArmResponse<Widget> | ErrorResponse;
}
