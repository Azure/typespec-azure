import type { DecoratorContext, DecoratorValidatorCallbacks, Model } from "@typespec/compiler";

/**
 * Deletes any key properties from the model.
 */
export type OmitKeyPropertiesDecorator = (
  context: DecoratorContext,
  entity: Model,
) => DecoratorValidatorCallbacks | void;

export type AzureCoreFoundationsDecorators = {
  omitKeyProperties: OmitKeyPropertiesDecorator;
};
