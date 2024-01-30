import "@typespec/versioning";

using TypeSpec.Versioning;

namespace Azure.ResourceManager.CommonTypes;

@Private.armCommonTypesVersions
@doc("The Azure Resource Manager common-types versions.")
enum Versions {
  @doc("The Azure Resource Manager v3 common types.")
  v3,

  @doc("The Azure Resource Manager v4 common types.")
  v4,

  @doc("The Azure Resource Manager v5 common types.")
  v5,
}
