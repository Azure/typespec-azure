using Reflection;

namespace Azure.ClientGenerator.Core.Legacy;

/**
 * Adds support for client-level multiple levels of inheritance.
 * 
 * This decorator will update the models returned from TCGC to include the multi-level inheritance information.
 *
 * This decorator is considered legacy functionality and may be deprecated in future releases.
 *
 * @param target The target model that will gain legacy inheritance behavior
 * @param value The model whose properties should be inherited from
 * @param scope Optional parameter to specify which language emitters this applies to
 *
 * @example Three-level inheritance
 * 
 * ```typespec
 * @discriminator("kind")
 * model A {
 *   kind: string;
 * }
 *
 * model BContent {
 *   foo: string;
 * }
 *
 * model B extends A{
 *   kind: "B";
 *   ...BContent;
 * }

 * @Azure.ClientGenerator.Core.Legacy.legacyHierarchyBuilding(B)
 * model C extends A{
 *   ...BContent;
 *   kind: "C";
 * }
 * ```
 */
extern dec legacyHierarchyBuilding(target: Model, value: Model, scope?: valueof string);
