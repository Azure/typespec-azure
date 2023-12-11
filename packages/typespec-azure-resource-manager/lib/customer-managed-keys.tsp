using Azure.Core;
using Azure.ResourceManager.Private;

namespace Azure.ResourceManager;

@doc("(Optional) Discouraged to include in resource definition. Only needed where it is possible to disable platform (AKA infrastructure) encryption. Azure SQL TDE is an example of this. Values are enabled and disabled.")
enum InfrastructureEncryption {
  @doc("Encryption is enabled")
  Enabled: "enabled",

  @doc("Encryption is disabled")
  Disabled: "disabled",
}

@doc("The type of identity to use.")
enum KeyEncryptionIdentity {
  @doc("System assigned identity")
  SystemAssignedIdentity: "systemAssignedIdentity",

  @doc("User assigned identity")
  UserAssignedIdentity: "userAssignedIdentity",

  @doc("Delegated identity")
  DelegatedResourceIdentity: "delegatedResourceIdentity",
}

@doc("Customer-managed key encryption properties for the resource.")
model CustomerManagedKeyEncryption {
  @doc("The type of identity to use. Values can be systemAssignedIdentity, userAssignedIdentity, or delegatedResourceIdentity.")
  keyEncryptionIdentity?: KeyEncryptionIdentity;

  @doc("User assigned identity to use for accessing key encryption key Url. Ex: /subscriptions/fa5fc227-a624-475e-b696-cdd604c735bc/resourceGroups/<resource group>/providers/Microsoft.ManagedIdentity/userAssignedIdentities/myId. Mutually exclusive with identityType systemAssignedIdentity.")
  userAssignedIdentityResourceId?: ResourceIdentifier<[
    {
      type: "Microsoft.ManagedIdentity/userAssignedIdentities";
    }
  ]>;

  @doc("application client identity to use for accessing key encryption key Url in a different tenant. Ex: f83c6b1b-4d34-47e4-bb34-9d83df58b540")
  federatedClientId?: uuid;

  @doc("delegated identity to use for accessing key encryption key Url. Ex: /subscriptions/fa5fc227-a624-475e-b696-cdd604c735bc/resourceGroups/<resource group>/providers/Microsoft.ManagedIdentity/userAssignedIdentities/myId. Mutually exclusive with identityType systemAssignedIdentity and userAssignedIdentity - internal use only.")
  delegatedIdentityClientId: uuid;
}

@doc("All encryption configuration for a resource.")
@armCommonDefinition(
  "encryption",
  Azure.ResourceManager.CommonTypes.Versions.v5,
  "customermanagedkeys.json"
)
model EncryptionConfiguration {
  @doc("Indicates if infrastructure encryption is enabled or disabled.")
  infrastructureEncryption?: InfrastructureEncryption;

  @doc("All customer-managed key encryption properties for the resource.")
  customerManagedKeyEncryption?: CustomerManagedKeyEncryption;

  @doc("key encryption key Url, versioned or unversioned. Ex: https://contosovault.vault.azure.net/keys/contosokek/562a4bb76b524a1493a6afe8e536ee78 or https://contosovault.vault.azure.net/keys/contosokek.")
  keyEncryptionKeyUrl?: string;
}

/**
 * Model used only to spread in the `encryption` envelope property for a resource.
 * @example
 *
 * ```typespec
 * model Foo is TrackedResource<FooProperties> {
 *   ...Encryption;
 * }
 * ```
 */
@doc("All encryption configuration for a resource.")
model Encryption {
  @doc("All encryption configuration for a resource.")
  encryption: EncryptionConfiguration;
}
