using Reflection;

namespace Azure.ClientGenerator.Core;

/**
 * Replace a parameter in an operation with a new parameter definition.
 * This function creates a new operation with the specified parameter replaced,
 * enabling composable transformations without mutating the original operation.
 *
 * Note: Parameter removal (using `void` as replacement) is not supported when used with `@@override`.
 *
 * @param operation The operation to transform.
 * @param selector The parameter to replace, specified either by name (string) or by direct reference (ModelProperty).
 * @param replacement The replacement parameter.
 * @returns A new operation with the parameter replaced.
 *
 * @example Making an optional parameter required
 * ```typespec
 * model RequiredMaxResults {
 *   maxResults: int32;
 * }
 *
 * @@override(KeyVault.getSecrets, replaceParameter(KeyVault.getSecrets, "maxResults", RequiredMaxResults.maxResults));
 * ```
 *
 * @example Chaining transformations
 * ```typespec
 * alias Step1 = replaceParameter(MyService.myOp, "oldParam", NewParams.newParam);
 * @@override(MyService.myOp, replaceParameter(Step1, "anotherParam", NewParams.anotherParam));
 * ```
 */
#suppress "experimental-feature" "replaceParameter uses extern fn which is experimental but provides essential parameter transformation functionality"
extern fn replaceParameter(
  operation: Reflection.Operation,
  selector: valueof string | Reflection.ModelProperty,
  replacement: Reflection.ModelProperty | void
): Reflection.Operation;

/**
 * Add a new parameter to an operation.
 * This function creates a new operation with the additional parameter appended,
 * enabling composable transformations without mutating the original operation.
 *
 * @param operation The operation to transform.
 * @param parameter The parameter to add to the operation.
 * @returns A new operation with the parameter added.
 *
 * @example Adding a required parameter
 * ```typespec
 * model ExtraParams {
 *   @header tracingId: string;
 * }
 *
 * @@override(MyService.myOp, addParameter(MyService.myOp, ExtraParams.tracingId));
 * ```
 *
 * @example Chaining with replaceParameter
 * ```typespec
 * model NewParams {
 *   oldParam: string;  // make required
 *   newParam: int32;
 * }
 *
 * alias Step1 = replaceParameter(MyService.myOp, "oldParam", NewParams.oldParam);
 * @@override(MyService.myOp, addParameter(Step1, NewParams.newParam));
 * ```
 */
#suppress "experimental-feature" "addParameter uses extern fn which is experimental but provides essential parameter transformation functionality"
extern fn addParameter(
  operation: Reflection.Operation,
  parameter: Reflection.ModelProperty
): Reflection.Operation;

/**
 * Reorder parameters of an operation according to the specified order.
 * This function creates a new operation with parameters reordered as specified,
 * enabling control over the parameter order in generated client SDK methods.
 *
 * @param operation The operation to transform.
 * @param order An array of parameter names specifying the desired order. All parameters must be included.
 * @returns A new operation with parameters reordered.
 *
 * @example Reordering parameters
 * ```typespec
 * @service
 * namespace MyService;
 *
 * op myOp(a: string, b: string, c: string): void;
 *
 * // Reorder to put 'c' first, then 'a', then 'b'
 * @@override(MyService.myOp, reorderParameters(MyService.myOp, #["c", "a", "b"]));
 * ```
 *
 * @example Chaining with other transformations
 * ```typespec
 * alias Step1 = addParameter(MyService.myOp, NewParams.newParam);
 * @@override(MyService.myOp, reorderParameters(Step1, #["newParam", "existingParam"]));
 * ```
 */
#suppress "experimental-feature" "reorderParameters uses extern fn which is experimental but provides essential parameter transformation functionality"
extern fn reorderParameters(
  operation: Reflection.Operation,
  order: valueof string[]
): Reflection.Operation;
