import "@azure-tools/typespec-autorest";

import "./base.tsp";
import "../../../node_modules/@azure-tools/typespec-azure-resource-manager/lib/common-types/private-links.tsp";

using Autorest;

namespace Azure.ResourceManager.CommonTypes;

@useRef("./types.json#/definitions/Resource")
model Resource {}

@@OpenAPI.extension(PrivateEndpointConnection.properties, "x-ms-client-flatten", true);
@@OpenAPI.extension(PrivateLinkResource.properties, "x-ms-client-flatten", true);

interface RegisterParams {
  v3(...PrivateEndpointConnectionParameter): void;
}
