import type { DecoratorContext, Model, Type } from "@typespec/compiler";
import type { SpreadCustomResponsePropertiesDecorator } from "../../../generated-defs/Azure.Core.Foundations.Private.js";

export const $spreadCustomResponseProperties: SpreadCustomResponsePropertiesDecorator = (
  context: DecoratorContext,
  entity: Model,
  customizations: Model,
) => {
  const customResponseProperties: Type | undefined =
    customizations.properties.get("response")?.type;
  if (customResponseProperties) {
    if (customResponseProperties.kind !== "Model") {
      // The constraint checker will have complained about this already.
      return;
    }

    // Copy all parameters into this model type
    // TODO: This needs to use the equivalent of Checker.checkSpreadProperty
    // once a helper method is available
    for (const [key, value] of customResponseProperties.properties) {
      entity.properties.set(
        key,
        context.program.checker.cloneType(value, {
          sourceProperty: value,
          model: entity,
        }),
      );
    }
  }
};
