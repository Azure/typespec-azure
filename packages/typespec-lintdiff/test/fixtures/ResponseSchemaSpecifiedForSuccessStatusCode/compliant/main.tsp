// Test: compliant
// Violation: ARM PUT operation returns 200 without a response schema.

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
  @doc("Description")
  description?: string;

  @doc("Resource provisioning state")
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

@doc("OK with no body")
model OkNoBody {
  @doc("Status code")
  @statusCode statusCode: 200;
}

@doc("Created with no body")
model CreatedNoBody {
  @doc("Status code")
  @statusCode statusCode: 201;
}

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
  delete is ArmResourceDeleteWithoutOkAsync<Widget>;

  @doc("Create or update a widget")
  @put
  @armResourceCreateOrUpdate(Widget)
  createOrUpdate(
    ...ResourceInstanceParameters<Widget>,
    @doc("Widget body") @bodyRoot body: Widget,
  ): OkNoBody | CreatedNoBody | ErrorResponse;
}
