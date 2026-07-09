import "./base-types.tsp";

using Azure.ResourceManager;
using Azure.ResourceManager.BaseTypes;

namespace Azure.ResourceManager.BaseTypes.Relationships;

// ============================================================================
// Relationship Metadata Types
// ============================================================================

/**
 * Contains metadata about a relationship.
 */
model RelationshipMetadata {
  /** The type of the relationship source. */
  sourceType: string;

  /** The type of the relationship target. */
  targetType: string;
}

/**
 * The origin type for a relationship.
 */
union RelationshipOriginType {
  /** The relationship was explicitly created by a user. */
  UserExplicitlyCreated: "UserExplicitlyCreated",

  /** The relationship was created automatically by a system rule. */
  SystemDiscoveredByRule: "SystemDiscoveredByRule",

  string,
}

/**
 * Metadata describing how a relationship originated.
 */
model OriginInformation {
  /** The origin type for the relationship. */
  relationshipOriginType: RelationshipOriginType;

  /** The discovery engine that created the relationship. */
  discoveryEngine?: string;

  /** The policy assignment that created the relationship. */
  policyAssignmentId?: string;
}

// ============================================================================
// Relationship Properties (resource property bag)
// ============================================================================

/**
 * Required properties for a relationship resource.
 * This model is used only as a constraint for template parameters.
 */
model RelationshipProperties {
  /** ARM-managed. Must include the base type descriptor for this resource. */
  @visibility(Lifecycle.Read)
  baseTypes: BaseTypeInfo[];

  /** The relationship source id. */
  sourceId: string;

  /** The relationship target id. */
  targetId: string;

  /** The tenant id of the target. */
  targetTenant: string;

  /** Metadata about the relationship source and target. */
  metadata: RelationshipMetadata;

  /** Origin information about the relationship. */
  originInformation?: OriginInformation;

  ...DefaultProvisioningStateProperty;
}

// ============================================================================
// Resource Templates
// ============================================================================

/**
 * Model template for a Relationship extension resource.
 * Applies the Relationship base type decorator automatically.
 * @template Properties RP-specific properties for the relationship (must extend RelationshipProperties)
 */
@azureBaseType(#{ baseType: "Relationship", version: "2024-06-01" })
model Relationship<Properties extends RelationshipProperties> is ExtensionResource<Properties>;
