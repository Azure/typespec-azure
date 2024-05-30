using Azure.Core;
using TypeSpec.Versioning;

namespace Azure.ResourceManager.CommonTypes;

/** (Optional) Discouraged to include in resource definition. Only needed where it is possible to disable platform (AKA infrastructure) encryption. Azure SQL TDE is an example of this. Values are enabled and disabled. */
@added(CommonTypes.Versions.v4)
union InfrastructureEncryption {
  /** Encryption is enabled */
  Enabled: "enabled",

  /** Encryption is disabled */
  Disabled: "disabled",

  string,
}

/** Alias of keyEncryptionKeyIdentity for back compatibility. Please change to keyEncryptionKeyIdentity. */
alias KeyEncryptionIdentity = KeyEncryptionKeyIdentity;

/** The type of identity to use. */
@added(CommonTypes.Versions.v4)
union KeyEncryptionKeyIdentity {
  /** System assigned identity */
  SystemAssignedIdentity: "systemAssignedIdentity",

  /** User assigned identity */
  UserAssignedIdentity: "userAssignedIdentity",

  /** Delegated identity */
  DelegatedResourceIdentity: "delegatedResourceIdentity",

  string,
}

/** Customer-managed key encryption properties for the resource. */
@added(CommonTypes.Versions.v4)
model CustomerManagedKeyEncryption {
  /** The type of identity to use. Values can be systemAssignedIdentity, userAssignedIdentity, or delegatedResourceIdentity. */
  keyEncryptionKeyIdentity?: KeyEncryptionKeyIdentity;

  /** User assigned identity to use for accessing key encryption key Url. Ex: /subscriptions/fa5fc227-a624-475e-b696-cdd604c735bc/resourceGroups/<resource group>/providers/Microsoft.ManagedIdentity/userAssignedIdentities/myId. Mutually exclusive with identityType systemAssignedIdentity. */
  userAssignedIdentityResourceId?: Azure.Core.armResourceIdentifier<[
    {
      type: "Microsoft.ManagedIdentity/userAssignedIdentities";
    }
  ]>;

  /** application client identity to use for accessing key encryption key Url in a different tenant. Ex: f83c6b1b-4d34-47e4-bb34-9d83df58b540 */
  federatedClientId?: uuid;

  /** delegated identity to use for accessing key encryption key Url. Ex: /subscriptions/fa5fc227-a624-475e-b696-cdd604c735bc/resourceGroups/<resource group>/providers/Microsoft.ManagedIdentity/userAssignedIdentities/myId. Mutually exclusive with identityType systemAssignedIdentity and userAssignedIdentity - internal use only. */
  delegatedIdentityClientId?: uuid;
}

/** All encryption configuration for a resource. */
@added(CommonTypes.Versions.v4)
model EncryptionConfiguration {
  /** Indicates if infrastructure encryption is enabled or disabled. */
  infrastructureEncryption?: InfrastructureEncryption;

  /** All customer-managed key encryption properties for the resource. */
  customerManagedKeyEncryption?: CustomerManagedKeyEncryption;

  /** key encryption key Url, versioned or unversioned. Ex: https://contosovault.vault.azure.net/keys/contosokek/562a4bb76b524a1493a6afe8e536ee78 or https://contosovault.vault.azure.net/keys/contosokek. */
  keyEncryptionKeyUrl?: string;
}
