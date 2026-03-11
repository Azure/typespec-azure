using Reflection;

namespace Azure.ClientGenerator.Core;

/**
 * Replace a parameter in an operation with a new parameter definition or remove it entirely.
 * This function creates a new operation with the specified parameter replaced or removed,
 * enabling composable transformations without mutating the original operation.
 *
 * @param operation The operation to transform.
 * @param selector The parameter to replace, specified either by name (string) or by direct reference (ModelProperty).
 * @param replacement The replacement parameter. Use `void` to remove the parameter entirely.
 * @returns A new operation with the parameter replaced or removed.
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
 * @example Removing a parameter
 * ```typespec
 * op getSecretsWithoutMaxResults is replaceParameter(KeyVault.getSecrets, "maxResults", void);
 * ```
 *
 * @example Chaining transformations
 * ```typespec
 * alias Step1 = replaceParameter(MyService.myOp, "unwantedParam", void);
 * alias Step2 = replaceParameter(Step1, "oldParam", NewParams.newParam);
 * ```
 */
#suppress "experimental-feature" "replaceParameter uses extern fn which is experimental but provides essential parameter transformation functionality"
extern fn replaceParameter(
  operation: Reflection.Operation,
  selector: valueof string | Reflection.ModelProperty,
  replacement: Reflection.ModelProperty | void
): Reflection.Operation;

/**
 * Replace the return type of an operation with a new type.
 * This function creates a new operation with the return type replaced,
 * enabling composable transformations without mutating the original operation.
 *
 * @param operation The operation to transform.
 * @param returnType The new return type for the operation.
 * @returns A new operation with the return type replaced.
 *
 * @example Changing the return type to a custom model
 * ```typespec
 * model CustomResponse {
 *   data: string;
 *   metadata: Record<string>;
 * }
 *
 * @@override(MyService.getData, replaceResponse(MyService.getData, CustomResponse));
 * ```
 *
 * @example Chaining with replaceParameter
 * ```typespec
 * alias Step1 = replaceParameter(MyService.myOp, "oldParam", NewParams.newParam);
 * @@override(MyService.myOp, replaceResponse(Step1, CustomResponse));
 * ```
 */
#suppress "experimental-feature" "replaceResponse uses extern fn which is experimental but provides essential parameter transformation functionality"
extern fn replaceResponse(
  operation: Reflection.Operation,
  returnType: unknown
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
 * alias Step1 = replaceParameter(MyService.myOp, "oldParam", void);
 * @@override(MyService.myOp, addParameter(Step1, NewParams.newParam));
 * ```
 */
#suppress "experimental-feature" "addParameter uses extern fn which is experimental but provides essential parameter transformation functionality"
extern fn addParameter(
  operation: Reflection.Operation,
  parameter: Reflection.ModelProperty
): Reflection.Operation;
