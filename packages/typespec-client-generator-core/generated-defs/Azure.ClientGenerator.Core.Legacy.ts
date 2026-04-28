import type {
  DecoratorContext,
  DecoratorValidatorCallbacks,
  Model,
  ModelProperty,
  Numeric,
  Operation,
  Type,
} from "@typespec/compiler";

/**
 * Adds support for client-level multiple levels of inheritance and arbitrary
 * inheritance replacement.
 *
 * This decorator updates the models returned from TCGC to override the base
 * type of the target model. There are two supported scenarios:
 *
 * 1. **Multi-level discriminated inheritance** (original use case): when
 * discriminated subtypes need to inherit from a sibling rather than the
 * discriminator root.
 * 2. **Arbitrary base-class replacement** (issue 3737): when a client SDK
 * needs to keep API compatibility with a previously-generated SDK that
 * used a different base class.
 *
 * ### Reconciliation rule
 *
 * After the rebase is applied, TCGC reconciles the target model's
 * properties so the SDK shape stays consistent:
 *
 * 1. Gather all properties currently observed on the target — its own
 * properties **plus** properties contributed by every removed
 * intermediate ancestor (the parents that the rebase walked past).
 * 2. Drop any of those whose name is supplied anywhere in the new base
 * chain (the new parent **and** all of its ancestors), since the new
 * base will provide them via inheritance.
 * 3. Whatever remains becomes the rebased model's own properties.
 *
 * When step 2 drops a property whose type does not match the same-named
 * property on the new base chain, TCGC reports a
 * `legacy-hierarchy-building-conflict` warning so the spec author can
 * align the types.
 *
 * This decorator is considered legacy functionality and may be deprecated in
 * future releases.
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
 * @example Replace the base class. Properties contributed by the removed
 * intermediate parent (`b`) are kept on the rebased model.
 *
 * ```typespec
 * model C {
 *   c?: string;
 * }
 * model B extends C {
 *   b?: string;
 * }
 *
 * @Azure.ClientGenerator.Core.Legacy.hierarchyBuilding(C)
 * model A extends B {
 *   a?: string;
 * }
 * // After: A extends C, A's own properties are { a, b }, C still supplies c.
 * ```
 * @example Rebase a model whose own properties (via spread) overlap with
 * the new base. Overlapping same-typed properties are deduplicated silently.
 *
 * ```typespec
 * model B {
 *   propB: string;
 * }
 *
 * model A {
 *   ...B;
 *   propA: string;
 * }
 *
 * @@Legacy.hierarchyBuilding(A, B);
 * // After: A extends B, A's own property is just { propA }.
 * ```
 */
export type HierarchyBuildingDecorator = (
  context: DecoratorContext,
  target: Model,
  value: Model,
  scope?: string,
) => DecoratorValidatorCallbacks | void;

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
) => DecoratorValidatorCallbacks | void;

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
) => DecoratorValidatorCallbacks | void;

/**
 * Forces an operation to be treated as a pageable operation by the SDK generators,
 * even when the operation does not follow standard paging patterns on the service side.
 *
 * NOTE: When used, you will need to verify the operation and add tests for the generated code
 * to make sure the end-to-end works for library users, since there is a risk that forcing
 * this operation to be pageable will result in errors.
 *
 * When applied, TCGC will treat the operation as pageable and SDK generators should:
 * - Generate paging mechanisms (iterators/async iterators)
 * - Return appropriate pageable-specific return types
 * - Handle the operation as a collection that may require multiple requests
 *
 * This decorator is considered legacy functionality and should only be used when
 * standard TypeSpec paging patterns are not feasible.
 *
 * @param target The operation that should be treated as a pageable operation
 * @param scope Specifies the target language emitters that the decorator should apply.
 * If not set, the decorator will be applied to all language emitters by default.
 * You can use "!" to exclude specific languages, for example: !(java, python) or !java, !python.
 * @example Force a regular operation to be treated as pageable for backward compatibility
 * ```typespec
 * @Azure.ClientGenerator.Core.Legacy.markAsPageable
 * @route("/items")
 * @get
 * op listItems(): ItemListResult;
 * ```
 */
export type MarkAsPageableDecorator = (
  context: DecoratorContext,
  target: Operation,
  scope?: string,
) => DecoratorValidatorCallbacks | void;

/**
 * Prevents an operation from being treated as a pageable operation by the SDK generators,
 * even when the operation follows standard paging patterns (e.g., decorated with `@list`).
 *
 * When applied, the operation will be treated as a basic method:
 * - The response will be the paged model itself (not the list of items)
 * - The paged model will not be marked with paged result usage
 * - No paging mechanisms (iterators/async iterators) will be generated
 *
 * This decorator is considered legacy functionality and should only be used when
 * you need to override the default paging behavior for specific operations.
 *
 * @param target The operation that should NOT be treated as a pageable operation
 * @param scope Specifies the target language emitters that the decorator should apply.
 * If not set, the decorator will be applied to all language emitters by default.
 * You can use "!" to exclude specific languages, for example: !(java, python) or !java, !python.
 * @example Prevent a paging operation from being treated as pageable
 * ```typespec
 * @Azure.ClientGenerator.Core.Legacy.disablePageable
 * @list
 * @route("/items")
 * @get
 * op listItems(): ItemListResult;
 * ```
 */
export type DisablePageableDecorator = (
  context: DecoratorContext,
  target: Operation,
  scope?: string,
) => DecoratorValidatorCallbacks | void;

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
  verb: Type,
  scope?: string,
) => DecoratorValidatorCallbacks | void;

/**
 * Sets a client-level default value for a model property or operation parameter.
 *
 * This decorator allows brownfield services to specify default values that will be
 * used by SDK generators, maintaining backward compatibility with existing SDK users
 * who may rely on default values that were previously generated from Swagger definitions.
 *
 * This decorator is considered legacy functionality and should only be used for
 * maintaining backward compatibility in existing services. New services should use
 * standard TypeSpec patterns for default values.
 *
 * @param target The model property or operation parameter that should have a client-level default value
 * @param value The default value to be used by SDK generators (must be a string, number, or boolean literal)
 * @param scope Specifies the target language emitters that the decorator should apply.
 * If not set, the decorator will be applied to all language emitters by default.
 * You can use "!" to exclude specific languages, for example: !(java, python) or !java, !python.
 * @example Set a default value for a model property
 * ```typespec
 * model RequestOptions {
 *   @Azure.ClientGenerator.Core.Legacy.clientDefaultValue(30)
 *   timeout?: int32;
 *
 *   @Azure.ClientGenerator.Core.Legacy.clientDefaultValue("standard")
 *   tier?: string;
 * }
 * ```
 * @example Set a default value for an operation parameter
 * ```typespec
 * op getItems(
 *   @Azure.ClientGenerator.Core.Legacy.clientDefaultValue(10)
 *   @query pageSize?: int32
 * ): Item[];
 * ```
 * @example Apply default value only for specific languages
 * ```typespec
 * model Config {
 *   @Azure.ClientGenerator.Core.Legacy.clientDefaultValue(false, "python")
 *   enableCache?: boolean;
 * }
 * ```
 */
export type ClientDefaultValueDecorator = (
  context: DecoratorContext,
  target: ModelProperty,
  value: string | boolean | Numeric,
  scope?: string,
) => DecoratorValidatorCallbacks | void;

export type AzureClientGeneratorCoreLegacyDecorators = {
  hierarchyBuilding: HierarchyBuildingDecorator;
  flattenProperty: FlattenPropertyDecorator;
  markAsLro: MarkAsLroDecorator;
  markAsPageable: MarkAsPageableDecorator;
  disablePageable: DisablePageableDecorator;
  nextLinkVerb: NextLinkVerbDecorator;
  clientDefaultValue: ClientDefaultValueDecorator;
};
