namespace Azure.ClientGenerator.Core.CSharp;

using TypeSpec.Reflection;

/**
 * Whether a model needs the custom JSON converter, this is only used for backward compatibility.
 * @param scope The language scope you want this decorator to apply to. If not specified, will only apply to csharp emitter.
 *
 * @example
 * ```typespec
 * @hasJSONConverter
 * model MyModel {
 *   prop: string;
 * }
 * ```
 */
extern dec hasJSONConverter(target: Model, scope?: "csharp");
