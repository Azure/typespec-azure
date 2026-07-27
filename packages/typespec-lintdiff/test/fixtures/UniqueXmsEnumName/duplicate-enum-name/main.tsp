// Test: duplicate-enum-name
// Compliance: TypeSpec enums each get a unique x-ms-enum name
//   derived from their type name.

import "../../lib/imports.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
@versioned(Versions)
namespace Microsoft.TestService;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v5)
  v2024_01_01: "2024-01-01",
}

@doc("Widget status")
union WidgetStatus {
  string,
  @doc("Active") Active: "Active",
  @doc("Inactive") Inactive: "Inactive",
}

@doc("Gadget status")
union GadgetStatus {
  string,
  @doc("Running") Running: "Running",
  @doc("Stopped") Stopped: "Stopped",
}

model Widget is TrackedResource<WidgetProperties> {
  @key("widgetName")
  @segment("widgets")
  @doc("The name of the widget")
  @path
  name: string;
}

model WidgetProperties {
  @doc("Widget status")
  widgetStatus?: WidgetStatus;

  @doc("Gadget status")
  gadgetStatus?: GadgetStatus;
}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
  delete is ArmResourceDeleteWithoutOkAsync<Widget>;
  listByResourceGroup is ArmResourceListByParent<Widget>;
  listBySubscription is ArmListBySubscription<Widget>;
}
