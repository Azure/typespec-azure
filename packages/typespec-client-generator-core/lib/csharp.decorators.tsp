using TypeSpec.Reflection;

namespace Azure.ClientGenerator.Core.Csharp;

/**
 * Whether a model needs the custom JSON converter, this is only used for backward compatibility.
 * @param value Whether to generate the model needs the custom JSON converter or not.
 * @param scope The language scope you want this decorator to apply to. If not specified, will only apply to csharp emitter.
 *
 * @example
 * ```typespec
 * @hasJSONConverter(true)
 * model MyModel {
 *   prop: string;
 * }
 * ```
 */
extern dec hasJSONConverter(target: Model, value?: valueof boolean, scope?: "csharp");
