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

@friendlyName("FriendlyTemplatePayload")
model FriendlyTemplatePayload<T> {
  value: T;
}

enum RequestMode {
  automatic: "Automatic",
  manual: "Manual",
}

union RequestKind {
  standard: "Standard",
  premium: "Premium",
}

model EncodedWire {
  @encode("custom", int32)
  payload: PropertyRequest;

  @encode("custom", int32)
  choice: ObjectChoice;

  @encode("custom", int32)
  friendlyTemplatePayload: FriendlyTemplatePayload<string>;

  @encode("custom", PropertyRequest)
  inlinePrimitive: string;

  @encode("custom", PropertyRequest)
  defaultedEnum: RequestMode = RequestMode.automatic;

  @encode("custom", PropertyRequest)
  defaultedUnion: RequestKind = RequestKind.standard;

  @Azure.ResourceManager.CommonTypes.Private.inlineAzureType
  @encode("custom", PropertyRequest)
  inlineAzureScalar: Azure.Core.azureLocation;
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

  @post
  @armResourceAction(Widget)
  submitFriendlyTemplateEncodedProperty(
    ...ResourceInstanceParameters<Widget>,
    @body body: EncodedWire.friendlyTemplatePayload,
  ): ArmResponse<Widget> | ErrorResponse;

  @post
  @armResourceAction(Widget)
  submitInlineUntypedEncodedProperty(
    ...ResourceInstanceParameters<Widget>,
    @body body: EncodedWire.inlinePrimitive,
  ): ArmResponse<Widget> | ErrorResponse;

  @post
  @armResourceAction(Widget)
  submitDefaultedEnumEncodedProperty(
    ...ResourceInstanceParameters<Widget>,
    @body body: EncodedWire.defaultedEnum,
  ): ArmResponse<Widget> | ErrorResponse;

  @post
  @armResourceAction(Widget)
  submitDefaultedUnionEncodedProperty(
    ...ResourceInstanceParameters<Widget>,
    @body body: EncodedWire.defaultedUnion,
  ): ArmResponse<Widget> | ErrorResponse;

  @post
  @armResourceAction(Widget)
  submitInlineAzureScalarEncodedProperty(
    ...ResourceInstanceParameters<Widget>,
    @body body: EncodedWire.inlineAzureScalar,
  ): ArmResponse<Widget> | ErrorResponse;
}
