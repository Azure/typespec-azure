using Reflection;

namespace Azure.ResourceManager.BaseTypes;

/**
 * The set of Azure base types a resource may declare conformance to via the
 * `@azureBaseType` decorator. Modeled as an extensible (open) enum so additional
 * base types can be introduced without a breaking change.
 */
union BaseType {
  /** The Agent base type. */
  Agent: "Agent",

  /** The Relationship base type. */
  Relationship: "Relationship",

  string,
}

/**
 * An ARM-managed base type descriptor identifying the schema contract a resource conforms to.
 * Used as a parameter to the `@azureBaseType` decorator to indicate which
 * base types a resource conforms to.
 */
model BaseTypeInfo {
  /** The base type identifier. */
  baseType: BaseType;

  /** The schema version of the base type. */
  version: string;
}

/**
 * `@azureBaseType` marks an Azure Resource Manager resource properties model as implementing
 * a base type. Base types define structured constraints including required and
 * optional properties that conforming resources must implement.
 *
 * This decorator may be applied multiple times to indicate conformance to
 * multiple base types. Duplicate entries are ignored.
 *
 * @param baseType The base type specification this resource implements.
 *
 * @example
 *
 * ```typespec
 * // Agent definition and properties using the Appliance deployment model
 * model ContosoApplianceDefinition is AgentDefinitionAppliance<true, true>;
 * model ContosoApplianceProperties is AgentPropertiesAppliance<ContosoApplianceDefinition> {
 *   ...DefaultProvisioningStateProperty;
 * }
 *
 * // The @azureBaseType decorator marks the resource as conforming to the Agent base type.
 * // (The Agent template applies this automatically, but it can also be applied directly.)
 * @azureBaseType(#{ baseType: BaseType.Agent, version: "2026-04-01" })
 * model ContosoApplianceAgent is TrackedResource<ContosoApplianceProperties> {
 *   ...ResourceNameParameter<ContosoApplianceAgent>;
 * }
 * ```
 */
extern dec azureBaseType(target: Model, baseType: valueof BaseTypeInfo);
