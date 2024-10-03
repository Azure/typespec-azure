import "@azure-tools/typespec-autorest";

import "./base.tsp";
import "../../node_modules/@azure-tools/typespec-azure-resource-manager/lib/common-types/network-security-perimeter.tsp";

using Autorest;

namespace Azure.ResourceManager.CommonTypes;

@useRef("./types.json#/definitions/Resource")
model Resource {}

@useRef("./types.json#/definitions/ProxyResource")
model ProxyResource {
  @visibility("read")
  id?: Azure.Core.armResourceIdentifier;
}

interface RegisterParams {
  @Versioning.added(Versions.v5)
  v5(...NetworkSecurityPerimeterConfigurationNameParameter): void;
}
