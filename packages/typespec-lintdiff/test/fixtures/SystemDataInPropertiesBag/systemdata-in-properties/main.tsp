// Test: systemdata-in-properties
// Compliance: The SystemDataInPropertiesBag rule uses resolved:true, but
// common-types $ref resolution fails in the test framework. Cannot be validated.

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

model Widget is TrackedResource<WidgetProperties> {
  @key("widgetName")
  @segment("widgets")
  @doc("The name of the widget")
  @path
  name: string;
}

model CustomSystemData {
  @doc("Created by")
  createdBy?: string;

  @doc("Created at")
  createdAt?: utcDateTime;
}

model WidgetProperties {
  @doc("Description")
  description?: string;

  @doc("System data in properties bag - violates rule")
  systemData?: CustomSystemData;
}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
}
