import type { DecoratorContext, DecoratorValidatorCallbacks, Model } from "@typespec/compiler";

/**
 * An ARM-managed base type descriptor identifying the schema contract a resource conforms to.
 * Used as a parameter to the `@azureBaseType` decorator to indicate which
 * base types a resource conforms to.
 */
export interface BaseTypeInfo {
  /**
   * The base type identifier.
   */
  readonly baseType: "Agent" | "Relationship" | string;
  /**
   * The schema version of the base type.
   */
  readonly version: string;
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
 * @example
 * ```typespec
 * // Agent definition and properties using the Appliance deployment model
 * model ContosoApplianceDefinition is AgentDefinitionAppliance<true>;
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
export type AzureBaseTypeDecorator = (
  context: DecoratorContext,
  target: Model,
  baseType: BaseTypeInfo,
) => DecoratorValidatorCallbacks | void;

export type AzureResourceManagerBaseTypesDecorators = {
  azureBaseType: AzureBaseTypeDecorator;
};
