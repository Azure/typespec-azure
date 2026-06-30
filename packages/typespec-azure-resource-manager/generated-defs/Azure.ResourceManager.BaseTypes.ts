import type { DecoratorContext, DecoratorValidatorCallbacks, Model } from "@typespec/compiler";

export interface BaseTypeInfo {
  readonly baseType: string;
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
 * model MyAgentProperties {
 *   displayName: string;
 *   description: string;
 * }
 *
 * @azureBaseType(#{ baseType: "Agent", version: "2024-06-01" })
 * model MyAgent is TrackedResource<MyAgentProperties> {
 *   @key("myAgentName") @segment("myAgents") name: string;
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
