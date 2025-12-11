import type { DecoratorContext, Model } from "@typespec/compiler";

/**
 * Deletes any key properties from the model.
 */
export type OmitKeyPropertiesDecorator = (context: DecoratorContext, entity: Model) => void;

export type AzureCoreFoundationsDecorators = {
  omitKeyProperties: OmitKeyPropertiesDecorator;
};
