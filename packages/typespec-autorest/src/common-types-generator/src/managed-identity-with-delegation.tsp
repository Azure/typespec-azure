import "@azure-tools/typespec-autorest";

import "./base.tsp";
import "../../../node_modules/@azure-tools/typespec-azure-resource-manager/lib/common-types/managed-identity-with-delegation.tsp";

using Autorest;
namespace Azure.ResourceManager.CommonTypes;

@useRef("./managedidentity.json#/definitions/ManagedServiceIdentity")
model ManagedServiceIdentity {}
