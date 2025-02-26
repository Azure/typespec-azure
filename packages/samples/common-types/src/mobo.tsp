import "./base.tsp";

import "../../node_modules/@azure-tools/typespec-azure-resource-manager/lib/common-types/mobo.tsp";

using OpenAPI;

namespace Azure.ResourceManager.CommonTypes;

@@extension(ManagedOnBehalfOfConfiguration.moboBrokerResources, "x-ms-identifiers", ["id"]);
