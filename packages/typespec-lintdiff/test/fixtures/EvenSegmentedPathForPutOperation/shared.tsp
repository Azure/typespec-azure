import "../lib/imports.tsp";

using TypeSpec.Http;
using TypeSpec.OpenAPI;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
@versioned(Versions)
@armCommonTypesVersion(CommonTypes.Versions.v6)
namespace Microsoft.TestService;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v6)
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

@doc("Widget PUT request body.")
model WidgetConfigRequest {
  @doc("Configuration value")
  config: string;
}

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface Widgets {
  @extension("x-ms-examples", #{})
  get is ArmResourceRead<Widget>;

  @extension("x-ms-examples", #{})
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;

  @extension("x-ms-examples", #{})
  update is ArmResourcePatchAsync<Widget, WidgetProperties>;

  @extension("x-ms-examples", #{})
  delete is ArmResourceDeleteWithoutOkAsync<Widget>;

  @extension("x-ms-examples", #{})
  listByResourceGroup is ArmResourceListByParent<Widget>;

  @extension("x-ms-examples", #{})
  listBySubscription is ArmListBySubscription<Widget>;
}
