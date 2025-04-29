import "@azure-tools/typespec-autorest";

import "./base.tsp";
import "../../common-types/network-security-perimeter.tsp";

using Autorest;
using OpenAPI;

@info(#{ title: "Network security perimeter common type definitions" })
@doc("Common types for network security perimeters based on a shared API specification. These common, versioned type definitions are intended for resource providers (RPs, except Network RP) to use, and reuse, for defining their own API versions that share a set of type definitions that is consistent across providers.")
namespace Azure.ResourceManager.CommonTypes;

@useRef("./types.json#/definitions/Resource")
model Resource {}

@useRef("./types.json#/definitions/ProxyResource")
model ProxyResource {
  @visibility(Lifecycle.Read)
  id?: Azure.Core.armResourceIdentifier;
}

interface RegisterParams {
  @Versioning.added(Versions.v5)
  v5(...NetworkSecurityPerimeterConfigurationNameParameter): void;
}
