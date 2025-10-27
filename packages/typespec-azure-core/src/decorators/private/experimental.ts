import { DecoratorContext, Enum, Model, ModelProperty, Scalar, Union } from "@typespec/compiler";

export function $changePropertyType(
  _: DecoratorContext,
  target: ModelProperty,
  newType: Model | Union | Scalar | Enum,
) {
  target.type = newType;
}

export function $extendModel(_: DecoratorContext, target: Model, baseModel: Model) {
  for (const [propName, prop] of baseModel.properties) {
    if (target.properties.has(propName)) {
      continue;
    }
    target.properties.set(propName, prop);
  }
}

export function $copyVariants(_: DecoratorContext, target: Union, sourceUnion: Union) {
  for (const [variantName, variantType] of sourceUnion.variants) {
    if (target.variants.has(variantName)) {
      continue;
    }
    target.variants.set(variantName, variantType);
  }
}
