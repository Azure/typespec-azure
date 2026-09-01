// Test: explicit-schema-type-bodies
// Violation: each request body emits an explicit non-object schema type.

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

@doc("A named scalar with an explicit string base.")
scalar StringRequest extends string;

@doc("An unbased scalar encoded as an explicit integer schema.")
@encode("custom", int32)
scalar EncodedRequest;

@doc("An unbased scalar whose formatted encode-as type supplies the schema type.")
@encode("", int32)
scalar EmptyEncodedIntegerRequest;

@encode("custom", int32)
scalar NestedWire;

@encode("", NestedWire)
scalar NestedEncodedRequest;

@doc("An unbased scalar whose unsupported encoding still supplies a string schema type.")
@encode("unsupported", string)
scalar UnsupportedEncodedRequest;

scalar UntypedWire;

@encode("unsupported", UntypedWire)
scalar UnsupportedWire;

@encode("", UnsupportedWire)
scalar UnsupportedNestedEncodingRequest extends string;

model InlineEncodedWire {
  @encode("custom", int32)
  payload: {
    value: string;
  };
}

@doc("A non-empty request enum.")
enum RequestMode {
  fast: "fast",
}

@doc("A named string union.")
union RequestChoice {
  fast: "fast",
}

@doc("A file request body.")
model UploadRequest extends TypeSpec.Http.File {}

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
  delete is ArmResourceDeleteWithoutOkAsync<Widget>;

  @post
  @armResourceAction(Widget)
  submitScalar(...ResourceInstanceParameters<Widget>, @body body: StringRequest):
    | ArmResponse<Widget>
    | ErrorResponse;

  @post
  @armResourceAction(Widget)
  submitEncodedScalar(...ResourceInstanceParameters<Widget>, @body body: EncodedRequest):
    | ArmResponse<Widget>
    | ErrorResponse;

  @post
  @armResourceAction(Widget)
  submitEmptyEncodedInteger(
    ...ResourceInstanceParameters<Widget>,
    @body body: EmptyEncodedIntegerRequest,
  ): ArmResponse<Widget> | ErrorResponse;

  @post
  @armResourceAction(Widget)
  submitNestedEncoding(...ResourceInstanceParameters<Widget>, @body body: NestedEncodedRequest):
    | ArmResponse<Widget>
    | ErrorResponse;

  @post
  @armResourceAction(Widget)
  submitUnsupportedEncoding(
    ...ResourceInstanceParameters<Widget>,
    @body body: UnsupportedEncodedRequest,
  ): ArmResponse<Widget> | ErrorResponse;

  @post
  @armResourceAction(Widget)
  submitUnsupportedNestedEncoding(
    ...ResourceInstanceParameters<Widget>,
    @body body: UnsupportedNestedEncodingRequest,
  ): ArmResponse<Widget> | ErrorResponse;

  @post
  @armResourceAction(Widget)
  submitInlineEncodedProperty(
    ...ResourceInstanceParameters<Widget>,
    @body body: InlineEncodedWire.payload,
  ): ArmResponse<Widget> | ErrorResponse;

  @post
  @armResourceAction(Widget)
  submitEnum(...ResourceInstanceParameters<Widget>, @body body: RequestMode):
    | ArmResponse<Widget>
    | ErrorResponse;

  @post
  @armResourceAction(Widget)
  submitEnumMember(...ResourceInstanceParameters<Widget>, @body body: RequestMode.fast):
    | ArmResponse<Widget>
    | ErrorResponse;

  @post
  @armResourceAction(Widget)
  submitUnionVariant(...ResourceInstanceParameters<Widget>, @body body: RequestChoice.fast):
    | ArmResponse<Widget>
    | ErrorResponse;

  @post
  @armResourceAction(Widget)
  submitTuple(...ResourceInstanceParameters<Widget>, @body body: [string, string]):
    | ArmResponse<Widget>
    | ErrorResponse;

  @post
  @armResourceAction(Widget)
  submitLiteral(...ResourceInstanceParameters<Widget>, @body body: "fixed"):
    | ArmResponse<Widget>
    | ErrorResponse;

  @post
  @armResourceAction(Widget)
  submitStringTemplate(...ResourceInstanceParameters<Widget>, @body body: "prefix-${string}"):
    | ArmResponse<Widget>
    | ErrorResponse;

  @post
  @armResourceAction(Widget)
  uploadFile(...ResourceInstanceParameters<Widget>, @body body: UploadRequest):
    | ArmResponse<Widget>
    | ErrorResponse;
}
