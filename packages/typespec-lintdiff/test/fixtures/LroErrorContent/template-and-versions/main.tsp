import "../../lib/imports.tsp";
import "@azure-tools/typespec-client-generator-core";
using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ResourceManager;

@armProviderNamespace
@service
@versioned(Versions)
namespace Microsoft.VersionedErrors;
enum Versions {
  @useDependency(CommonTypes.Versions.v5)
  old: "2024-01-01",

  @useDependency(CommonTypes.Versions.v5)
  current: "2025-01-01",
}
model Widget is TrackedResource<WidgetProperties> {
  @key("widgetName")
  @segment("widgets")
  @path
  name: string;
}
model WidgetProperties {
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}
@error
model CustomError {
  code: string;
}
interface Operations extends Azure.ResourceManager.Operations {}
@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget, Error = CustomError>;
  delete is ArmResourceDeleteWithoutOkAsync<Widget>;
  @removed(Versions.current)
  oldAction is ArmResourceActionAsync<Widget, void, void, Error = CustomError>;
  @TypeSpec.OpenAPI.extension("x-ms-long-running-operation", false)
  disabled is ArmResourceActionAsync<Widget, void, void, Error = CustomError>;
}
namespace Nested {
  @route("/marked")
  @post
  @Azure.ClientGenerator.Core.Legacy.markAsLro
  op marked(): AcceptedResponse | CustomError;
}
