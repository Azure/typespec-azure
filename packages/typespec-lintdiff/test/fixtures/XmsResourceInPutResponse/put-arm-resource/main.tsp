import "../../lib/imports.tsp";

using TypeSpec.Versioning;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
@versioned(Versions)
namespace Microsoft.TestService;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v5)
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v3)
  v2024_01_01: "2024-01-01",
}

interface Operations extends Azure.ResourceManager.Operations {}

/** A widget resource. */
model Widget is TrackedResource<WidgetProperties> {
  ...ResourceNameParameter<Widget>;
}

/** Widget properties. */
model WidgetProperties {
  /** A display name. */
  displayName?: string;
}

@armResourceOperations
interface Widgets {
  /** Creates or replaces a widget. */
  createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;
}
