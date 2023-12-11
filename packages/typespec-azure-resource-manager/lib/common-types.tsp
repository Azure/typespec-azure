import "@typespec/versioning";

using TypeSpec.Versioning;

namespace Azure.ResourceManager.CommonTypes;

@Private.armCommonTypesVersions
@doc("The ARM common-types versions.")
enum Versions {
  @doc("The ARM v3 common types.")
  v3,

  @doc("The ARM v4 common types.")
  v4,

  @doc("The ARM v5 common types.")
  v5,
}
