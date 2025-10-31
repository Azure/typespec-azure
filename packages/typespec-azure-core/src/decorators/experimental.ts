import { DecoratorContext, Enum, Model, ModelProperty, Scalar, Union } from "@typespec/compiler";
import { reportDiagnostic } from "../lib.js";

export function $changePropertyType(
  context: DecoratorContext,
  target: ModelProperty,
  newType: Model | Union | Scalar | Enum,
) {
  reportDiagnostic(context.program, {
    code: "experimental-feature",
    target: target,
  });
  target.type = newType;
}

export function $extendModel(context: DecoratorContext, target: Model, baseModel: Model) {
  reportDiagnostic(context.program, {
    code: "experimental-feature",
    target: target,
  });
  for (const [propName, prop] of baseModel.properties) {
    if (target.properties.has(propName)) {
      continue;
    }
    target.properties.set(propName, prop);
  }
}

export function $copyVariants(context: DecoratorContext, target: Union, sourceUnion: Union) {
  reportDiagnostic(context.program, {
    code: "experimental-feature",
    target: target,
  });
  for (const [variantName, variantType] of sourceUnion.variants) {
    if (target.variants.has(variantName)) {
      continue;
    }
    target.variants.set(variantName, variantType);
  }
}
