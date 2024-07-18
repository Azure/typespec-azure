import type { DecoratorContext, Enum, Model, ModelProperty, Union } from "@typespec/compiler";

/**
 * Marks an enum as representing the valid `common-types` versions.
 */
export type ArmCommonTypesVersionsDecorator = (context: DecoratorContext, target: Enum) => void;

/**
 *
 *
 *
 * @param definitionName Definition name
 * @param version Azure Resource Manager Version
 * @param referenceFile Reference file
 */
export type ArmCommonParameterDecorator = (
  context: DecoratorContext,
  target: ModelProperty,
  definitionName?: string,
  version?: unknown | unknown | string,
  referenceFile?: string
) => void;

/**
 *
 *
 *
 * @param definitionName Definition name
 * @param version Azure Resource Manager Version
 * @param referenceFile Reference file
 */
export type ArmCommonDefinitionDecorator = (
  context: DecoratorContext,
  target: Model | Enum | Union,
  definitionName?: string,
  version?: unknown | unknown | string,
  referenceFile?: string
) => void;
