using Reflection;

namespace Azure.ClientGenerator.Core.Legacy;

/**
 * Adds support for client-level multiple levels of inheritance.
 * 
 * This decorator will update the models returned from TCGC to include the multi-level inheritance information.
 *
 * @param target The target type (operation, model, enum, etc.) for which you want to apply client-specific documentation.
 * @param documentation The client-specific documentation to apply
 * @param mode Specifies how to apply the documentation (append or replace)
 * @param scope Specifies the target language emitters that the decorator should apply. If not set, the decorator will be applied to all language emitters by default.
 * You can use "!" to exclude specific languages, for example: !(java, python) or !java, !python.
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
