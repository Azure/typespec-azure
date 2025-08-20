import type { DecoratorContext, Model, Type } from "@typespec/compiler";
import type { SpreadCustomParametersDecorator } from "../../../generated-defs/Azure.Core.Foundations.Private.js";

export const $spreadCustomParameters: SpreadCustomParametersDecorator = (
  context: DecoratorContext,
  entity: Model,
  customizations: Model,
) => {
  const customParameters: Type | undefined = customizations.properties.get("parameters")?.type;
  if (customParameters) {
    if (customParameters.kind !== "Model") {
      // The constraint checker will have complained about this already.
      return;
    }

    // Copy all parameters into this model type
    // TODO: This needs to use the equivalent of Checker.checkSpreadProperty
    // once a helper method is available
    for (const [key, value] of customParameters.properties) {
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
