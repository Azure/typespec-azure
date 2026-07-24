import "./base-types.tsp";

namespace Azure.ResourceManager.BaseTypes.Relationships;

// ============================================================================
// Relationship Properties (resource property bag)
// ============================================================================

/**
 * Required properties for a relationship resource.
 * @template ProvisioningState The relationship provisioning state values.
 */
model RelationshipProperties<ProvisioningState extends string = ResourceProvisioningState> {
  /** ARM-managed. Must include the base type descriptor for this resource. */
  @visibility(Lifecycle.Read)
  baseTypes: BaseTypeInfo[];

  /** The relationship source identifier. */
  sourceId: string;

  /** The tenant identifier of the relationship source. */
  sourceTenant: string;

  /** The relationship target identifier. */
  targetId: string;

  /** The tenant identifier of the relationship target. */
  targetTenant: string;

  /** The provisioning state of the relationship. */
  @visibility(Lifecycle.Read)
  provisioningState?: ProvisioningState;
}

// ============================================================================
// Resource Templates
// ============================================================================

/**
 * Model template for a Relationship extension resource.
 * Applies the Relationship base type decorator automatically.
 * @template Properties RP-specific properties for the relationship (must extend RelationshipProperties)
 */
@azureBaseType(#{ baseType: BaseType.Relationship, version: "2026-04-01" })
model Relationship<Properties extends RelationshipProperties = RelationshipProperties>
  is ExtensionResource<Properties>;
