import "./base-types.tsp";

namespace Azure.ResourceManager.BaseTypes.Relationships;

// ============================================================================
// Relationship endpoints and metadata
// ============================================================================

/**
 * Source endpoint information for a relationship.
 */
model RelationshipSource {
  /** The ARM resource identifier of the relationship source. */
  id: string;

  /** The type of the relationship source. */
  type: string;
}

/**
 * Target endpoint information for a relationship.
 */
model RelationshipTarget {
  /** The ARM resource identifier of the relationship target. */
  id: string;

  /** The type of the relationship target. */
  type: string;

  /** The tenant identifier of the relationship target. */
  tenant: string;
}

/**
 * RP-defined metadata describing the relationship.
 */
model RelationshipMetadata {}

/**
 * Origin information for a relationship.
 */
model RelationshipOriginInformation {
  /** The origin type. */
  relationshipOriginType: string;

  /** The discovery engine that found the relationship. */
  discoveryEngine?: string;
}

/**
 * The provisioning state of a relationship.
 */
@Azure.Core.lroStatus
union RelationshipProvisioningState {
  /** The relationship operation succeeded. */
  @Azure.Core.lroSucceeded
  Succeeded: "Succeeded",

  /** The relationship operation failed. */
  @Azure.Core.lroFailed
  Failed: "Failed",

  /** The response was cancelled. */
  @Azure.Core.lroCanceled
  Cancelled: "Cancelled",

  /** The relationship operation has not started. */
  NotStarted: "NotStarted",

  /** The relationship is provisioning. */
  Provisioning: "Provisioning",

  /** The relationship is updating. */
  Updating: "Updating",

  /** The relationship is deleting. */
  Deleting: "Deleting",

  string,
}

// ============================================================================
// Relationship Properties (resource property bag)
// ============================================================================

/**
 * Required properties for a relationship resource.
 * @template Source The relationship source model.
 * @template Target The relationship target model.
 * @template Metadata The relationship metadata model.
 * @template OriginInformation The relationship origin information model.
 */
model RelationshipProperties<
  Source extends RelationshipSource = RelationshipSource,
  Target extends RelationshipTarget = RelationshipTarget,
  Metadata extends RelationshipMetadata = RelationshipMetadata,
  OriginInformation extends RelationshipOriginInformation = RelationshipOriginInformation
> {
  /** ARM-managed. Must include the base type descriptor for this resource. */
  @visibility(Lifecycle.Read)
  baseTypes: BaseTypeInfo[];

  /** The relationship source. */
  source: Source;

  /** The relationship target. */
  target: Target;

  /** RP-defined metadata describing the relationship. */
  metadata?: Metadata;

  /** Origin information for the relationship. */
  originInformation?: OriginInformation;

  /** The provisioning state of the relationship. */
  provisioningState: RelationshipProvisioningState;
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
model Relationship<Properties extends RelationshipProperties = RelationshipProperties>
  is ExtensionResource<Properties>;
