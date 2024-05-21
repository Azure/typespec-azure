using Azure.ResourceManager.Private;

namespace Azure.ResourceManager.Foundations;

#deprecated "Please change ManagedIdentityProperties to ManagedServiceIdentity."
alias ManagedIdentityProperties = ManagedServiceIdentity;
/**
 * The properties of the managed service identities assigned to this resource.
 */
@armCommonDefinition(
  "ManagedServiceIdentity",
  {
    version: Azure.ResourceManager.CommonTypes.Versions.v4,
    isDefault: true,
  },
  "managedidentity.json"
)
@armCommonDefinition(
  "ManagedServiceIdentity",
  Azure.ResourceManager.CommonTypes.Versions.v5,
  "managedidentity.json"
)
model ManagedServiceIdentity {
  @doc("The Active Directory tenant id of the principal.")
  @visibility("read")
  tenantId?: string;

  @doc("The active directory identifier of this principal.")
  @visibility("read")
  principalId?: string;

  @doc("The type of managed identity assigned to this resource.")
  type: ManagedServiceIdentityType;

  @doc("The identities assigned to this resource by the user.")
  userAssignedIdentities?: Record<UserAssignedIdentity>;
}

/** The set of user assigned identities associated with the resource. The userAssignedIdentities dictionary keys will be ARM resource ids in the form: '/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ManagedIdentity/userAssignedIdentities/{identityName}. The dictionary values can be empty objects ({}) in requests.", */
#deprecated "Do not use this model. Instead, use Record<UserAssignedIdentity> directly. Using this model will result in a different client SDK when generated from TypeSpec compared to the Swagger."
@armCommonDefinition(
  "UserAssignedIdentities",
  {
    version: Azure.ResourceManager.CommonTypes.Versions.v4,
    isDefault: true,
  },
  "managedidentity.json"
)
@armCommonDefinition(
  "UserAssignedIdentities",
  Azure.ResourceManager.CommonTypes.Versions.v5,
  "managedidentity.json"
)
model UserAssignedIdentities is Record<UserAssignedIdentity>;

#deprecated "Please change ManagedSystemIdentityProperties to SystemAssignedServiceIdentity."
alias ManagedSystemIdentityProperties = SystemAssignedServiceIdentity;
/**
 * The properties of the service-assigned identity associated with this resource.
 */
@armCommonDefinition(
  "SystemAssignedServiceIdentity",
  {
    version: Azure.ResourceManager.CommonTypes.Versions.v4,
    isDefault: true,
  },
  "managedidentity.json"
)
@armCommonDefinition(
  "SystemAssignedServiceIdentity",
  Azure.ResourceManager.CommonTypes.Versions.v5,
  "managedidentity.json"
)
model SystemAssignedServiceIdentity {
  @doc("The Active Directory tenant id of the principal.")
  @visibility("read")
  tenantId?: string;

  @doc("The active directory identifier of this principal.")
  @visibility("read")
  principalId?: string;

  @doc("The type of managed identity assigned to this resource.")
  type: SystemAssignedServiceIdentityType;
}

/** Alias of ManagedServiceIdentityType for back compatability. Please change to ManagedServiceIdentityType. */
#deprecated "Please change to ManagedServiceIdentityType."
alias ManagedIdentityType = ManagedServiceIdentityType;
/**
 * A managed identity assigned by the user.
 */
@armCommonDefinition(
  "UserAssignedIdentity",
  {
    version: Azure.ResourceManager.CommonTypes.Versions.v4,
    isDefault: true,
  },
  "managedidentity.json"
)
@armCommonDefinition(
  "UserAssignedIdentity",
  Azure.ResourceManager.CommonTypes.Versions.v5,
  "managedidentity.json"
)
@doc("A managed identity assigned by the user.")
model UserAssignedIdentity {
  @doc("The active directory client identifier for this principal.")
  clientId?: string;

  @doc("The active directory identifier for this principal.")
  principalId?: string;
}

/**
 * The kind of managed identity assigned to this resource.
 */
@doc("The kind of managed identity assigned to this resource.")
union ManagedServiceIdentityType {
  @doc("No managed identity.")
  None: "None",

  @doc("System assigned managed identity.")
  SystemAssigned: "SystemAssigned",

  @doc("User assigned managed identity.")
  UserAssigned: "UserAssigned",

  @doc("System and user assigned managed identity.")
  SystemAndUserAssigned: "SystemAssigned, UserAssigned",

  string,
}

/** Alias of SystemAssignedServiceIdentityType for back compatability. Please change to SystemAssignedServiceIdentityType. */
alias ManagedSystemIdentityType = SystemAssignedServiceIdentityType;

/**
 * The kind of managemed identity assigned to this resource.
 */
@doc("The kind of managemed identity assigned to this resource.")
union SystemAssignedServiceIdentityType {
  @doc("No managed system identity.")
  None: "None",

  @doc("System assigned managed system identity.")
  SystemAssigned: "SystemAssigned",

  string,
}
