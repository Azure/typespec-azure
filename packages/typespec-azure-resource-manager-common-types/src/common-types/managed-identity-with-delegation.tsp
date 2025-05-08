import "@azure-tools/typespec-autorest";

import "./base.tsp";
import "@azure-tools/typespec-azure-resource-manager/common-types/managed-identity-with-delegation.tsp";

using Autorest;
namespace Azure.ResourceManager.CommonTypes;

@useRef("./managedidentity.json#/definitions/ManagedServiceIdentity")
model ManagedServiceIdentity {}
