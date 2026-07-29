// Test: legacy-operations-custom-response
// Violation: The provider operations API is declared with
// `Azure.ResourceManager.Legacy.Operations<Response>` but supplies a service-defined
// response model instead of the common-types OperationListResult schema.
//
// This shape satisfies the existing `missing-operations-endpoint` TypeSpec lint, so no
// TypeSpec diagnostic covers the validator violation.

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

  @doc("Resource provisioning state")
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
  delete is ArmResourceDeleteWithoutOkAsync<Widget>;
  listByResourceGroup is ArmResourceListByParent<Widget>;
  listBySubscription is ArmListBySubscription<Widget>;
}

@doc("Custom operation display info.")
model CustomDisplay {
  @doc("Provider name") provider?: string;
  @doc("Resource type") resource?: string;
  @doc("Operation name") operation?: string;
  @doc("Description") description?: string;
}

@doc("Custom operation definition.")
model CustomOp {
  @doc("Operation name") name?: string;
  @doc("Whether this is a data action") isDataAction?: boolean;
  @doc("Display info") display?: CustomDisplay;
}

@doc("Custom operation list result.")
model CustomOpListResult {
  @doc("List of operations")
  @pageItems
  value: CustomOp[];

  @doc("Link to the next page of results")
  @nextLink
  nextLink?: url;
}

interface Operations
  extends Azure.ResourceManager.Legacy.Operations<ArmResponse<CustomOpListResult>> {}
