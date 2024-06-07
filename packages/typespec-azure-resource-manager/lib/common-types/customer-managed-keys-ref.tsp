import "./customer-managed-keys.tsp";

using Azure.ResourceManager.CommonTypes.Private;

namespace Azure.ResourceManager.CommonTypes;

@@armCommonDefinition(Encryption,
  "encryption",
  Azure.ResourceManager.CommonTypes.Versions.v4,
  "customermanagedkeys.json"
);
@@armCommonDefinition(Encryption,
  "encryption",
  Azure.ResourceManager.CommonTypes.Versions.v5,
  "customermanagedkeys.json"
);
