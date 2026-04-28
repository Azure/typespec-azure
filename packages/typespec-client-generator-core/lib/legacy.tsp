using Reflection;

namespace Azure.ClientGenerator.Core.Legacy;

/**
 * Change the base type of a model in the client SDK.
 *
 * This decorator updates the model returned from TCGC so that, in the
 * generated SDK, the target model inherits from a different base than the
 * one declared in the spec. The TypeSpec service definition is not
 * affected — only the SDK shape changes.
 *
 * Common real-world applications:
 *
 * - **Multi-level discriminated inheritance**: when discriminated subtypes
 *   need to inherit from a sibling rather than the discriminator root
 *   (e.g. `SportsCar` inheriting from `Car` instead of from `Vehicle`).
 * - **Brownfield base-class alignment**: when a client SDK needs to keep
 *   API compatibility with a previously-generated SDK that used a
 *   different base — typically rebasing onto a richer Azure resource base
 *   such as `TrackedResource` instead of plain `Resource`.
 *
 * ### Reconciliation rule
 *
 * After the rebase is applied, TCGC reconciles the target model's
 * properties so the SDK shape stays consistent:
 *
 * 1. Gather all properties currently observed on the target — its own
 *    properties **plus** properties contributed by every removed
 *    intermediate ancestor (the parents that the rebase walked past).
 * 2. Drop any of those whose name is supplied anywhere in the new base
 *    chain (the new parent **and** all of its ancestors), since the new
 *    base will provide them via inheritance.
 * 3. Whatever remains becomes the rebased model's own properties.
 *
 * When step 2 drops a property whose type is not assignable to (and not
 * assignable from) the same-named property on the new base chain — i.e.
 * the two types are unrelated, like `int32` vs `string` — TCGC reports a
 * `legacy-hierarchy-building-conflict` warning so the spec author can
 * align the types. Compatible refinements (a string literal vs `string`,
 * a sub-scalar like `azureLocation` vs `string`, etc.) stay silent.
 *
 * This decorator is considered legacy functionality and may be deprecated in
 * future releases.
 *
 * @param target The target model that will gain legacy inheritance behavior
 * @param value The model whose properties should be inherited from
 * @param scope Optional parameter to specify which language emitters this applies to
 *
 * @example Multi-level discriminated inheritance — rebase a discriminated
 * subtype onto a sibling so the SDK exposes a deeper hierarchy.
 *
 * ```typespec
 * @discriminator("type")
 * model Vehicle {
 *   type: string;
 * }
 *
 * model Car extends Vehicle {
 *   type: "car";
 *   doors: int32;
 * }
 *
 * @Azure.ClientGenerator.Core.Legacy.hierarchyBuilding(Car)
 * model SportsCar extends Vehicle {
 *   type: "sports";
 *   doors: int32;
 *   topSpeed: int32;
 * }
 * // SDK shape: SportsCar extends Car (instead of Vehicle directly).
 * // SportsCar's own properties: { type, topSpeed }; doors is inherited from Car.
 * ```
 *
 * @example Brownfield ARM resource — rebase a resource onto
 * `TrackedResource` so the generated SDK matches the previously-shipped
 * tracked-resource shape (`location`, `tags`, etc.).
 *
 * ```typespec
 * model Resource {
 *   id?: string;
 *   name?: string;
 *   type?: string;
 * }
 *
 * model TrackedResource extends Resource {
 *   location: string;
 *   tags?: Record<string>;
 * }
 *
 * model FooProperties {
 *   provisioningState?: string;
 * }
 *
 * @Azure.ClientGenerator.Core.Legacy.hierarchyBuilding(TrackedResource)
 * model Foo extends Resource {
 *   properties: FooProperties;
 *   location?: string;
 *   tags?: Record<string>;
 * }
 * // SDK shape: Foo extends TrackedResource.
 * // Foo's own properties: { properties }; location and tags are inherited from TrackedResource.
 * ```
 *
 * @example Brownfield ARM envelope — drop an `ArmTagsProperty` envelope
 * spread by rebasing onto a base that supplies the same properties
 * directly.
 *
 * ```typespec
 * model ArmTagsProperty {
 *   tags?: Record<string>;
 * }
 *
 * model TrackedResource {
 *   id?: string;
 *   name?: string;
 *   tags?: Record<string>;
 *   location?: string;
 * }
 *
 * @Azure.ClientGenerator.Core.Legacy.hierarchyBuilding(TrackedResource)
 * model FooResourceWithHierarchy {
 *   id?: string;
 *   name?: string;
 *   ...ArmTagsProperty;
 *   location?: string;
 * }
 * // SDK shape: FooResourceWithHierarchy extends TrackedResource with no own properties.
 * ```
 */
extern dec hierarchyBuilding(target: Model, value: Model, scope?: valueof string);

/**
 * Set whether a model property should be flattened or not.
 * This decorator is not recommended to use for green field services.
 * @param target The target model property that you want to flatten.
 * @param scope Specifies the target language emitters that the decorator should apply. If not set, the decorator will be applied to all language emitters by default.
 * You can use "!" to exclude specific languages, for example: !(java, python) or !java, !python.
 *
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
extern dec flattenProperty(target: ModelProperty, scope?: valueof string);

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
 *
 * @example Force a regular operation to be treated as LRO for backward compatibility
 * ```typespec
 * @Azure.ClientGenerator.Core.Legacy.markAsLro
 * @route("/deployments/{deploymentId}")
 * @post
 * op startDeployment(
 *   @path deploymentId: string,
 * ): DeploymentResult | ErrorResponse;
 * ```
 *
 */
extern dec markAsLro(target: Operation, scope?: valueof string);

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
 *
 * @example Force a regular operation to be treated as pageable for backward compatibility
 * ```typespec
 * @Azure.ClientGenerator.Core.Legacy.markAsPageable
 * @route("/items")
 * @get
 * op listItems(): ItemListResult;
 * ```
 *
 */
extern dec markAsPageable(target: Operation, scope?: valueof string);

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
 *
 * @example Prevent a paging operation from being treated as pageable
 * ```typespec
 * @Azure.ClientGenerator.Core.Legacy.disablePageable
 * @list
 * @route("/items")
 * @get
 * op listItems(): ItemListResult;
 * ```
 *
 */
extern dec disablePageable(target: Operation, scope?: valueof string);

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
 *
 * @example Specify POST for next link operations
 * ```typespec
 * @Azure.ClientGenerator.Core.Legacy.nextLinkVerb("POST")
 * @post
 * op listItems(): PageResult;
 * ```
 */
extern dec nextLinkVerb(target: Operation, verb: "GET" | "POST", scope?: valueof string);

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
 *
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
 *
 * @example Set a default value for an operation parameter
 * ```typespec
 * op getItems(
 *   @Azure.ClientGenerator.Core.Legacy.clientDefaultValue(10)
 *   @query pageSize?: int32
 * ): Item[];
 * ```
 *
 * @example Apply default value only for specific languages
 * ```typespec
 * model Config {
 *   @Azure.ClientGenerator.Core.Legacy.clientDefaultValue(false, "python")
 *   enableCache?: boolean;
 * }
 * ```
 */
extern dec clientDefaultValue(
  target: ModelProperty,
  value: valueof string | boolean | numeric,
  scope?: valueof string
);
