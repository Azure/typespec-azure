import type { DecoratorContext, Model, Type } from "@typespec/compiler";

/**
 * Whether a model needs the custom JSON converter, this is only used for backward compatibility.
 *
 * @param scope The language scope you want this decorator to apply to. If not specified, will only apply to csharp emitter.
 * @example
 * ```typespec
 * @hasJsonConverter
 * model MyModel {
 *   prop: string;
 * }
 * ```
 */
export type HasJsonConverterDecorator = (
  context: DecoratorContext,
  target: Model,
  scope?: Type
) => void;
