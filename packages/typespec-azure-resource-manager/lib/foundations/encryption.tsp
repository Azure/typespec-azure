using Azure.Core;

namespace Azure.ResourceManager.Foundations;

/** The type of identity to use. */
union KeyEncryptionKeyIdentityType {
  /** System assigned identity */
  SystemAssignedIdentity: "systemAssignedIdentity",

  /** User assigned identity */
  UserAssignedIdentity: "userAssignedIdentity",

  /** Delegated identity */
  DelegatedResourceIdentity: "delegatedResourceIdentity",

  string,
}

/** All identity configuration for Customer-managed key settings defining which identity should be used to auth to Key Vault. */
model KeyEncryptionKeyIdentity {
  /** The type of identity to use. Values can be systemAssignedIdentity, userAssignedIdentity, or delegatedResourceIdentity. */
  identityType?: KeyEncryptionKeyIdentityType;

  /** User assigned identity to use for accessing key encryption key Url. Ex: /subscriptions/fa5fc227-a624-475e-b696-cdd604c735bc/resourceGroups/<resource group>/providers/Microsoft.ManagedIdentity/userAssignedIdentities/myId. Mutually exclusive with identityType systemAssignedIdentity. */
  userAssignedIdentityResourceId?: Azure.Core.armResourceIdentifier;

  /** application client identity to use for accessing key encryption key Url in a different tenant. Ex: f83c6b1b-4d34-47e4-bb34-9d83df58b540 */
  federatedClientId?: uuid;

  /** delegated identity to use for accessing key encryption key Url. Ex: /subscriptions/fa5fc227-a624-475e-b696-cdd604c735bc/resourceGroups/<resource group>/providers/Microsoft.ManagedIdentity/userAssignedIdentities/myId. Mutually exclusive with identityType systemAssignedIdentity and userAssignedIdentity - internal use only. */
  delegatedIdentityClientId?: uuid;
}

/** Customer-managed key encryption properties for the resource. */
model CustomerManagedKeyEncryption {
  /** All identity configuration for Customer-managed key settings defining which identity should be used to auth to Key Vault. */
  keyEncryptionKeyIdentity?: KeyEncryptionKeyIdentity;

  /** key encryption key Url, versioned or non-versioned. Ex: https://contosovault.vault.azure.net/keys/contosokek/562a4bb76b524a1493a6afe8e536ee78 or https://contosovault.vault.azure.net/keys/contosokek. */
  keyEncryptionKeyUrl?: string;
}
