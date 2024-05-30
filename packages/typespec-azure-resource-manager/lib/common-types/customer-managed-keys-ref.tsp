import "./customer-managed-keys.tsp";

namespace Azure.ResourceManager.CommonTypes.Private;

@@armCommonDefinition(EncryptionConfiguration,
  "encryption",
  Azure.ResourceManager.CommonTypes.Versions.v4,
  "customermanagedkeys.json"
);
@@armCommonDefinition(EncryptionConfiguration,
  "encryption",
  Azure.ResourceManager.CommonTypes.Versions.v5,
  "customermanagedkeys.json"
);
