import "./base.tsp";
import "@azure-tools/typespec-azure-resource-manager";

import "../../node_modules/@azure-tools/typespec-azure-resource-manager/lib/common-types/mobo.tsp";

using OpenAPI;

namespace Azure.ResourceManager.CommonTypes;

@@Azure.ResourceManager.identifiers(ManagedOnBehalfOfConfiguration.moboBrokerResources, #["id"]);
