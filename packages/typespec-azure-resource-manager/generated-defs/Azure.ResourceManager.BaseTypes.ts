import type { DecoratorContext, DecoratorValidatorCallbacks, Model } from "@typespec/compiler";

export interface BaseTypeInfo {
  readonly baseType: string;
  readonly version: string;
}

/**
 * `@azureBaseType` marks an Azure Resource Manager resource properties model as implementing
 * one or more base types. Base types define structured constraints including required and
 * optional properties that conforming resources must implement.
 *
 * The decorator attaches base type metadata to the model which can later be used for
 * validation of the resource structure.
 *
 * @param baseTypes The base type specifications this resource implements.
 * @example
 * ```typespec
 * @azureBaseType(#{ baseType: "Agent", version: "2024-06-01" })
 * model MyAgentProperties {
 *   ...AgentProperties;
 *   ...AgentToolProperty;
 *   ...DefaultProvisioningStateProperty;
 * }
 * ```
 */
export type AzureBaseTypeDecorator = (
  context: DecoratorContext,
  target: Model,
  ...baseTypes: BaseTypeInfo[]
) => DecoratorValidatorCallbacks | void;

export type AzureResourceManagerBaseTypesDecorators = {
  azureBaseType: AzureBaseTypeDecorator;
};
