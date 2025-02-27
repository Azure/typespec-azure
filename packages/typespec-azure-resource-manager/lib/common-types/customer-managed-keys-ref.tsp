import "./customer-managed-keys.tsp";

using Azure.ResourceManager.CommonTypes.Private;

namespace Azure.ResourceManager.CommonTypes;

@@armCommonDefinition(encryption,
  "encryption",
  #{ version: Azure.ResourceManager.CommonTypes.Versions.v4, isDefault: true },
  "customermanagedkeys.json"
);
@@armCommonDefinition(encryption,
  "encryption",
  Azure.ResourceManager.CommonTypes.Versions.v5,
  "customermanagedkeys.json"
);
@@armCommonDefinition(encryption,
  "encryption",
  Azure.ResourceManager.CommonTypes.Versions.v6,
  "customermanagedkeys.json"
);

@@armCommonDefinition(customerManagedKeyEncryption,
  "customerManagedKeyEncryption",
  #{ version: Azure.ResourceManager.CommonTypes.Versions.v4, isDefault: true },
  "customermanagedkeys.json"
);
@@armCommonDefinition(customerManagedKeyEncryption,
  "customerManagedKeyEncryption",
  Azure.ResourceManager.CommonTypes.Versions.v5,
  "customermanagedkeys.json"
);
@@armCommonDefinition(customerManagedKeyEncryption,
  "customerManagedKeyEncryption",
  Azure.ResourceManager.CommonTypes.Versions.v6,
  "customermanagedkeys.json"
);
