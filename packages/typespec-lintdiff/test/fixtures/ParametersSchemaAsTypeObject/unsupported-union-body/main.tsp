// Test: unsupported-union-body
// Violation: none. AutoRest emits an untyped schema for an unsupported model union.

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
  @doc("Description of the widget")
  description?: string;
}

@doc("First unsupported union branch.")
model FirstRequest {
  @doc("First value")
  first: string;
}

@doc("Second unsupported union branch.")
model SecondRequest {
  @doc("Second value")
  second: string;
}

@doc("An unsupported union of unrelated request models.")
union RequestUnion {
  FirstRequest,
  SecondRequest,
}

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
  delete is ArmResourceDeleteWithoutOkAsync<Widget>;

  @doc("Action with an unsupported union body")
  @post
  @armResourceAction(Widget)
  submit(...ResourceInstanceParameters<Widget>, @doc("The request body") @body body: RequestUnion):
    | ArmResponse<Widget>
    | ErrorResponse;
}
