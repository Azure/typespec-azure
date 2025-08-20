import { isKey, type DecoratorContext, type Model } from "@typespec/compiler";
import type { OmitKeyPropertiesDecorator } from "../../../generated-defs/Azure.Core.Foundations.js";

export const $omitKeyProperties: OmitKeyPropertiesDecorator = (
  context: DecoratorContext,
  entity: Model,
) => {
  // Delete any key properties from the model
  for (const [key, prop] of entity.properties) {
    if (isKey(context.program, prop)) {
      entity.properties.delete(key);
    }
  }
};
