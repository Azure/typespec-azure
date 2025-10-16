import type { DecoratorContext, Model, ModelProperty, Operation } from "@typespec/compiler";

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

/**
 * Forces an operation to be treated as a Long Running Operation (LRO) by the SDK generators,
 * even when the operation is not long-running on the service side.
 *
 * NOTE: When used, you will need to verify the operatio and add tests for the generated code
 * to make sure the end-to-end works for library users, since there is a risk that forcing
 * this operation to be LRO will result in errors.
 *
 * When applied, TCGC will treat the operation as an LRO and SDK generators should:
 * - Generate polling mechanisms (pollers)
 * - Return appropriate LRO-specific return types
 * - Handle the operation as an asynchronous long-running process
 *
 * This decorator is considered legacy functionality and should only be used when
 * standard TypeSpec LRO patterns are not feasible.
 *
 * @param target The operation that should be treated as a Long Running Operation
 * @param scope Specifies the target language emitters that the decorator should apply.
 * If not set, the decorator will be applied to all language emitters by default.
 * You can use "!" to exclude specific languages, for example: !(java, python) or !java, !python.
 * @example Force a regular operation to be treated as LRO for backward compatibility
 * ```typespec
 * @Azure.ClientGenerator.Core.Legacy.markAsLro
 * @route("/deployments/{deploymentId}")
 * @post
 * op startDeployment(
 *   @path deploymentId: string,
 * ): DeploymentResult | ErrorResponse;
 * ```
 */
export type MarkAsLroDecorator = (
  context: DecoratorContext,
  target: Operation,
  scope?: string,
) => void;

/**
 * Specifies the HTTP verb for the next link operation in a paging scenario.
 *
 * This decorator allows you to override the HTTP method used for fetching the next page
 * when the default GET method is not appropriate. Only "POST" and "GET" are supported.
 *
 * This decorator is considered legacy functionality and should only be used when
 * standard TypeSpec paging patterns are not sufficient.
 *
 * @param target The paging operation to specify next link operation behavior for
 * @param verb The HTTP verb to use for next link operations. Must be "POST" or "GET".
 * @param scope Specifies the target language emitters that the decorator should apply.
 * If not set, the decorator will be applied to all language emitters by default.
 * You can use "!" to exclude specific languages, for example: !(java, python) or !java, !python.
 * @example Specify POST for next link operations
 * ```typespec
 * @Azure.ClientGenerator.Core.Legacy.nextLinkVerb("POST")
 * @post
 * op listItems(): PageResult;
 * ```
 */
export type NextLinkVerbDecorator = (
  context: DecoratorContext,
  target: Operation,
  verb: string,
  scope?: string,
) => void;

export type AzureClientGeneratorCoreLegacyDecorators = {
  hierarchyBuilding: HierarchyBuildingDecorator;
  flattenProperty: FlattenPropertyDecorator;
  markAsLro: MarkAsLroDecorator;
  nextLinkVerb: NextLinkVerbDecorator;
};
