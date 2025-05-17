import "./base.tsp";

import "@azure-tools/typespec-azure-resource-manager/common-types/mobo.tsp";

using OpenAPI;

namespace Azure.ResourceManager.CommonTypes;

@@extension(ManagedOnBehalfOfConfiguration.moboBrokerResources, "x-ms-identifiers", #["id"]);
