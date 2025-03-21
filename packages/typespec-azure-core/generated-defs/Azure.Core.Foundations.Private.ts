import type { DecoratorContext, Model, Operation, Scalar, Type } from "@typespec/compiler";

/**
 * Provides a Model describing parameter customizations to spread into the target.
 *
 * @param customizations Model describing the customization to spread
 */
export type SpreadCustomParametersDecorator = (
  context: DecoratorContext,
  entity: Model,
  customizations: Model,
) => void;

/**
 * Provides a Model describing response property customizations to spread into the target.
 *
 * @param customizations Model describing the customization to spread
 */
export type SpreadCustomResponsePropertiesDecorator = (
  context: DecoratorContext,
  entity: Model,
  customizations: Model,
) => void;

/**
 * Checks the Resource parameter of an operation signature to ensure it's a valid resource type.
 * Also marks the operation as a resource operation.
 *
 * @param resourceType The possible resource Type to validate.
 */
export type EnsureResourceTypeDecorator = (
  context: DecoratorContext,
  entity: Operation,
  resourceType: Type,
) => void;

/**
 * Identifies that a model should be treated as an embedding vector.
 */
export type EmbeddingVectorDecorator = (
  context: DecoratorContext,
  entity: Model,
  type: Scalar,
) => void;

/**
 * Configuration for the armResourceIdentifier scalar
 */
export type ArmResourceIdentifierConfigDecorator = (
  context: DecoratorContext,
  target: Scalar,
  options: Type,
) => void;

/**
 * Checks the Resource parameter of an operation signature to ensure it's a valid resource type.
 */
export type NeedsRouteDecorator = (context: DecoratorContext, entity: Operation) => void;

/**
 * Issues a warning if an operation which derives from an operation templated marked with `@ensureVerb`
 * differs from the verb specified.
 *
 * @param templateName : Name of the template operation.
 * @param verb The intended HTTP verb.
 */
export type EnsureVerbDecorator = (
  context: DecoratorContext,
  entity: Operation,
  templateName: string,
  verb: string,
) => void;

/**
 * Sets the priority order of default final-state-via options for an operation
 *
 * @param states : list of final-state-via options in priority order
 */
export type DefaultFinalStateViaDecorator = (
  context: DecoratorContext,
  target: Operation,
  states: readonly ("operation-location" | "location" | "azure-async-operation")[],
) => void;

/**
 * Internal decorator marking a scalar as a next link that requires parameterization before use.
 *
 * You most likely don't need to use this decorator since next links that require parameterization are against
 * guidelines.
 */
export type ParameterizedNextLinkConfigDecorator = (
  context: DecoratorContext,
  target: Scalar,
  parameters: Type,
) => void;

export type AzureCoreFoundationsPrivateDecorators = {
  spreadCustomParameters: SpreadCustomParametersDecorator;
  spreadCustomResponseProperties: SpreadCustomResponsePropertiesDecorator;
  ensureResourceType: EnsureResourceTypeDecorator;
  embeddingVector: EmbeddingVectorDecorator;
  armResourceIdentifierConfig: ArmResourceIdentifierConfigDecorator;
  needsRoute: NeedsRouteDecorator;
  ensureVerb: EnsureVerbDecorator;
  defaultFinalStateVia: DefaultFinalStateViaDecorator;
  parameterizedNextLinkConfig: ParameterizedNextLinkConfigDecorator;
};
