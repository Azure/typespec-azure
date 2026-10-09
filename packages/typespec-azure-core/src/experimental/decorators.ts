import type {
  DecoratorContext,
  Enum,
  Model,
  ModelProperty,
  Scalar,
  Union,
} from "@typespec/compiler";
import type {
  ChangePropertyTypeDecorator,
  CopyPropertiesDecorator,
  CopyVariantsDecorator,
} from "../../generated-defs/experimental/Azure.Core.Experimental.js";
import { reportDiagnostic } from "../lib.js";

export const $changePropertyType: ChangePropertyTypeDecorator = (
  ctx: DecoratorContext,
  target: ModelProperty,
  newType: Model | Union | Scalar | Enum,
) => {
  reportDiagnostic(ctx.program, {
    code: "experimental-feature",
    messageId: "dangerous",
    format: {
      feature: "@changePropertyType",
    },
    target: ctx.decoratorTarget,
  });
  target.type = newType;
};

export const $copyProperties: CopyPropertiesDecorator = (
  ctx: DecoratorContext,
  target: Model,
  baseModel: Model,
) => {
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
};

export const $copyVariants: CopyVariantsDecorator = (
  ctx: DecoratorContext,
  target: Union,
  sourceUnion: Union,
) => {
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
};
