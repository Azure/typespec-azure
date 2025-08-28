import type { DecoratorContext, Model, ModelProperty } from "@typespec/compiler";

/**
 * Adds support for client-level multiple levels of inheritance.
 *
 * This decorator will update the models returned from TCGC to include the multi-level inheritance information.
 *
 * It could be used in the scenario where the discriminated models have multiple levels of inheritance, which is not supported by pure TypeSpec.
 *
 * This decorator is considered legacy functionality and may be deprecated in future releases.
 *
 * @param target The target model that will gain legacy inheritance behavior
 * @param value The model whose properties should be inherited from
 * @param scope Optional parameter to specify which language emitters this applies to
 * @example Build multiple levels inheritance for discriminated models.
 *
 * ```typespec
 * @discriminator("type")
 * model Vehicle {
 *   type: string;
 * }
 *
 * alias CarProperties = {
 *  make: string;
 *  model: string;
 *  year: int32;
 * }
 *
 * model Car extends Vehicle {
 *   type: "car";
 *   ...CarProperties;
 * }
 *
 * @Azure.ClientGenerator.Core.Legacy.hierarchyBuilding(Car)
 * model SportsCar extends Vehicle {
 *   type: "sports";
 *   ...CarProperties;
 *   topSpeed: int32;
 * }
 *
 * ```
 */
export type HierarchyBuildingDecorator = (
  context: DecoratorContext,
  target: Model,
  value: Model,
  scope?: string,
) => void;

/**
 * Set whether a model property should be flattened or not.
 * This decorator is not recommended to use for green field services.
 *
 * @param target The target model property that you want to flatten.
 * @param scope Specifies the target language emitters that the decorator should apply. If not set, the decorator will be applied to all language emitters by default.
 * You can use "!" to exclude specific languages, for example: !(java, python) or !java, !python.
 * @example
 * ```typespec
 * model Foo {
 *    @flattenProperty
 *    prop: Bar;
 * }
 * model Bar {
 * }
 * ```
 */
export type FlattenPropertyDecorator = (
  context: DecoratorContext,
  target: ModelProperty,
  scope?: string,
) => void;

export type AzureClientGeneratorCoreLegacyDecorators = {
  hierarchyBuilding: HierarchyBuildingDecorator;
  flattenProperty: FlattenPropertyDecorator;
};
