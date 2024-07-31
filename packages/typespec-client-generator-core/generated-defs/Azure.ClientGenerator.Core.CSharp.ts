import type { DecoratorContext, Model } from "@typespec/compiler";

/**
 * Whether a model needs the custom JSON converter, this is only used for backward compatibility for csharp.
 *
 * @example
 * ```typespec
 * @hasJsonConverter
 * model MyModel {
 *   prop: string;
 * }
 * ```
 */
export type HasJsonConverterDecorator = (context: DecoratorContext, target: Model) => void;
