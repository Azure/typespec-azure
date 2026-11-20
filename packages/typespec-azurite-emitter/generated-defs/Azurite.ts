import type {
  DecoratorContext,
  DecoratorValidatorCallbacks,
  ModelProperty,
} from "@typespec/compiler";

/**
 * Marks a model property as optional for Azurite without editing the shared service TypeSpec.
 *
 * @param target The model property to make optional.
 */
export type MakeOptionalDecorator = (
  context: DecoratorContext,
  target: ModelProperty,
) => DecoratorValidatorCallbacks | void;

export type AzuriteDecorators = {
  makeOptional: MakeOptionalDecorator;
};
