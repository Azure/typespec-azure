import { DecoratorContext, Enum, Model, ModelProperty, Scalar, Union } from "@typespec/compiler";
import { reportDiagnostic } from "../lib.js";

export function $changePropertyType(
  ctx: DecoratorContext,
  target: ModelProperty,
  newType: Model | Union | Scalar | Enum,
) {
  reportDiagnostic(ctx.program, {
    code: "experimental-feature",
    messageId: "dangerous",
    format: {
      feature: "@changePropertyType",
    },
    target: ctx.decoratorTarget,
  });
  target.type = newType;
}

export function $copyProperties(ctx: DecoratorContext, target: Model, baseModel: Model) {
  reportDiagnostic(ctx.program, {
    code: "experimental-feature",
    messageId: "dangerous",
    format: {
      feature: "@copyProperties",
    },
    target: ctx.decoratorTarget,
  });

  for (const [propName, prop] of baseModel.properties) {
    if (target.properties.has(propName)) {
      continue;
    }
    target.properties.set(propName, prop);
  }
}

export function $copyVariants(ctx: DecoratorContext, target: Union, sourceUnion: Union) {
  reportDiagnostic(ctx.program, {
    code: "experimental-feature",
    messageId: "dangerous",
    format: {
      feature: "@copyVariants",
    },
    target: ctx.decoratorTarget,
  });

  for (const [variantName, variantType] of sourceUnion.variants) {
    if (target.variants.has(variantName)) {
      continue;
    }
    target.variants.set(variantName, variantType);
  }
}
