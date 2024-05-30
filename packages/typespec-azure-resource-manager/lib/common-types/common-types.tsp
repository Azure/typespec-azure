import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "./common-types.tsp";
import "./types-ref.tsp";
import "./managed-identity-ref.tsp";
import "./private-links-ref.tsp";
import "./customer-managed-keys-ref.tsp";
import "./extended-location-ref.tsp";
import "./internal.tsp";
import "./commontypes.private.decorators.tsp";

using TypeSpec.Versioning;

@versioned(Versions)
namespace Azure.ResourceManager.CommonTypes;

@CommonTypes.Private.armCommonTypesVersions
@doc("The Azure Resource Manager common-types versions.")
enum Versions {
  @doc("The Azure Resource Manager v3 common types.")
  v3,

  @doc("The Azure Resource Manager v4 common types.")
  v4,

  @doc("The Azure Resource Manager v5 common types.")
  v5,
}
