using TypeSpec.Reflection;

namespace Azure.ClientGenerator.Core;

/**
 * Changes the name of a method, parameter, property, or model generated in the client SDK
 * @param rename The rename you want applied to the object
 * @param scope The language scope you want this decorator to apply to. If not specified, will apply to all language emitters
 *
 * @example
 * ```typespec
 * @clientName("nameInClient")
 * op nameInService: void;
 * ```
 */
extern dec clientName(target: unknown, rename: valueof string, scope?: valueof string);

/**
 * Whether you want to generate an operation as a convenient operation.
 * @param value Whether to generate the operation as convenience method or not.
 * @param scope The language scope you want this decorator to apply to. If not specified, will apply to all language emitters
 *
 * @example
 * ```typespec
 * @convenientAPI(false)
 * op test: void;
 * ```
 */
extern dec convenientAPI(target: Operation, value?: valueof boolean, scope?: valueof string);

/**
 * Whether you want to generate an operation as a protocol operation.
 * @param value Whether to generate the operation as protocol or not.
 * @param scope The language scope you want this decorator to apply to. If not specified, will apply to all language emitters
 *
 * @example
 * ```typespec
 * @protocolAPI(false)
 * op test: void;
 * ```
 */
extern dec protocolAPI(target: Operation, value?: valueof boolean, scope?: valueof string);

/**
 * Create a ClientGenerator.Core client out of a namespace or interface
 * @param value Optional configuration for the service.
 * @param scope The language scope you want this decorator to apply to. If not specified, will apply to all language emitters
 *
 * @example Basic client setting
 * ```typespec
 * @client
 * namespace MyService {}
 * ```
 *
 * @example Setting with other service
 * ```typespec
 * namespace MyService {}
 *
 * @client({service: MyService})
 * interface MyInterface {}
 * ```
 *
 * @example Changing client name if you don't want <Interface/Namespace>Client
 * ```typespec
 * @client({client: MySpecialClient})
 * interface MyInterface {}
 * ```
 *
 * @example
 */
extern dec client(target: Namespace | Interface, value?: {}, scope?: valueof string);

/**
 * Create a ClientGenerator.Core operation group out of a namespace or interface
 * @param scope The language scope you want this decorator to apply to. If not specified, will apply to all language emitters
 *
 * @example
 * ```typespec
 * @operationGroup
 * interface MyInterface{}
 * ```
 */
extern dec operationGroup(target: Namespace | Interface, scope?: valueof string);

/**
 * Whether to exclude a model from generation for specific languages. By default we generate
 * all models that are included in operations.
 * @param scope The language scope you want this decorator to apply to. If not specified, will apply to all language emitters
 *
 * @example
 * ```typespec
 * @exclude("python")
 * model ModelToExclude {
 *   prop: valueof string
 * }
 * ```
 */
#deprecated "@exclude decorator is deprecated. Use `@usage` and `@access` decorator instead."
extern dec exclude(target: Model, scope?: valueof string);

/**
 * Whether to include a model in generation for specific languages. By default we generate
 * all models that are included in operations.
 * @param scope The language scope you want this decorator to apply to. If not specified, will apply to all language emitters
 *
 * @example
 * ```typespec
 * @include("python")
 * model ModelToInclude {
 *   prop: valueof string
 * }
 * ```
 */
#deprecated "@include decorator is deprecated. Use `@usage` and `@access` decorator instead."
extern dec include(target: Model, scope?: valueof string);

alias ClientFormat = "unixtime" | "iso8601" | "rfc1123" | "seconds";

/**
 * Can be used to explain the client type that the current TYPESPEC
 * type should map to.
 * @param value The client format to apply.
 * @example
 * ```typespec
 * model MyModel {
 *   @clientFormat("unixtime")
 *   created_at?: int64
 * }
 * ```
 */
#deprecated "@clientFormat decorator is deprecated. Use `@encode` decorator in `@typespec/core` instead."
extern dec clientFormat(target: ModelProperty, value: valueof ClientFormat);

/**
 * Whether to mark an operation as internal for specific languages,
 * meaning it should not be exposed to end SDK users
 * @param scope The language scope you want this decorator to apply to. If not specified, will apply to all language emitters
 *
 * @example
 * ```typespec
 * @internal("python")
 * op test: void;
 * ```
 */
#deprecated "@internal decorator is deprecated. Use `@access` decorator instead."
extern dec internal(target: Operation, scope?: valueof string);

/**
 * Usage value.
 */
enum Usage {
  /**
   * Used in request
   */
  input: 2,

  /**
   * Used in response
   */
  output: 4,
}

/**
 * Expand usage for models/enums. A model's default usage info is always calculated by the operations that use it.
 * You could use this decorator to expand the default usage info. (e.g. append Usage.input by @usage(Usage.input) to the calculated usage Usage.output becomes Usage.input | Usage.output)
 * @param value The usage info you want to set for this model.
 * @param scope The language scope you want this decorator to apply to. If not specified, will apply to all language emitters
 *
 * @example
 * ```typespec
 * @usage(Usage.input | Usage.output)
 * model InputAndOutPutModel {
 *   prop: string
 * }
 * ```
 */
extern dec usage(target: Model | Enum, value: EnumMember | Union, scope?: valueof string);

/**
 * Access value.
 */
enum Access {
  /**
   * Open to user
   */
  public: "public",

  /**
   * Hide from user
   */
  internal: "internal",
}

/**
 * Set access for operations, models and enums. All models that are only used in operations with access "internal" will be implicitly set to access "internal".
 * @param value The access info you want to set for this model or operation.
 * @param scope The language scope you want this decorator to apply to. If not specified, will apply to all language emitters
 *
 * @example
 * ```typespec
 * @access(Access.internal)
 * model ModelToHide {
 *   prop: valueof string
 * }
 * @access(Access.internal)
 * op test: void;
 * ```
 */
extern dec access(target: Model | Operation | Enum, value: EnumMember, scope?: valueof string);

/**
 * Set whether a model property should be flattened or not.
 * @param scope The language scope you want this decorator to apply to. If not specified, will apply to all language emitters
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
#deprecated "@flattenProperty decorator is not recommended to use."
extern dec flattenProperty(target: ModelProperty, scope?: valueof string);
