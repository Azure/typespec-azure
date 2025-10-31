import type {
  DecoratorContext,
  Enum,
  Model,
  ModelProperty,
  Scalar,
  Union,
} from "@typespec/compiler";

export type ChangePropertyTypeDecorator = (
  context: DecoratorContext,
  target: ModelProperty,
  newType: Model | Union | Scalar | Enum,
) => void;

export type ExtendModelDecorator = (
  context: DecoratorContext,
  target: Model,
  source: Model,
) => void;

export type CopyVariantsDecorator = (
  context: DecoratorContext,
  target: Union,
  sourceUnion: Union,
) => void;

export type AzureCoreExperimentalDecorators = {
  changePropertyType: ChangePropertyTypeDecorator;
  extendModel: ExtendModelDecorator;
  copyVariants: CopyVariantsDecorator;
};
