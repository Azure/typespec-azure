import "@azure-tools/typespec-client-generator-core";

import "./base.tsp";
import "../../node_modules/@azure-tools/typespec-azure-resource-manager/lib/common-types/customer-managed-keys.tsp";

using ClientGenerator.Core;

namespace Azure.ResourceManager.CommonTypes;

@@clientName(Encryption, "encryption", "@azure-tools/typespec-autorest");
