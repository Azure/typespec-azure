import type {
  DecoratorContext,
  DecoratorValidatorCallbacks,
  ModelProperty,
  Operation,
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

/**
 * Associates a TypeSpec operation with Azurite's existing Queue Operation enum member.
 *
 * @param target The operation to map.
 * @param name The existing Operation enum member name.
 */
export type OperationEnumNameDecorator = (
  context: DecoratorContext,
  target: Operation,
  name: string,
) => DecoratorValidatorCallbacks | void;

/**
 * Sets the dispatch pattern Azurite's queue context middleware uses for this operation.
 *
 * @param target The operation to map.
 * @param pattern The existing dispatch pattern, for example "/queue/messages".
 */
export type DispatchPatternDecorator = (
  context: DecoratorContext,
  target: Operation,
  pattern: string,
) => DecoratorValidatorCallbacks | void;

export type AzuriteDecorators = {
  makeOptional: MakeOptionalDecorator;
  operationEnumName: OperationEnumNameDecorator;
  dispatchPattern: DispatchPatternDecorator;
};
