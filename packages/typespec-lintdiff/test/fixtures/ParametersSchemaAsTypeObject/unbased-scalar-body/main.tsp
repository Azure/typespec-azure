// Test: unbased-scalar-body
// Violation: none. AutoRest emits untyped schemas for both request scalars.

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

@doc("An opaque request body with no scalar base.")
scalar OpaqueRequest;

scalar UntypedWire;

@doc("A based scalar whose unsupported encoding replaces its inherited type with no type.")
@encode("unsupported", UntypedWire)
scalar BasedEncodedAsUntypedRequest extends string;

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
  delete is ArmResourceDeleteWithoutOkAsync<Widget>;

  @doc("Action with an unbased scalar body")
  @post
  @armResourceAction(Widget)
  submit(
    ...ResourceInstanceParameters<Widget>,
    @doc("The request body") @body body: OpaqueRequest,
  ): ArmResponse<Widget> | ErrorResponse;

  @doc("Action with a based scalar encoded as an untyped scalar")
  @post
  @armResourceAction(Widget)
  submitBasedEncodedAsUntyped(
    ...ResourceInstanceParameters<Widget>,
    @doc("The request body") @body body: BasedEncodedAsUntypedRequest,
  ): ArmResponse<Widget> | ErrorResponse;
}
