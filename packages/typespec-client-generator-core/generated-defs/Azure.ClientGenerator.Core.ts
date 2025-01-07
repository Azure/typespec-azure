import type {
  DecoratorContext,
  Enum,
  EnumMember,
  Interface,
  Model,
  ModelProperty,
  Namespace,
  Operation,
  Scalar,
  Type,
  Union,
} from "@typespec/compiler";

/**
 * Changes the name of a method, parameter, property, or model generated in the client SDK
 *
 * @param rename The rename you want applied to the object
 * @param scope The language scope you want this decorator to apply to. If not specified, will apply to all language emitters.
 * You can use "!" to specify negation such as "!(java, python)" or "!java, !python".
 * @example
 * ```typespec
 * @clientName("nameInClient")
 * op nameInService: void;
 * ```
 * @example
 * ```typespec
 * @clientName("nameForJava", "java")
 * @clientName("name_for_python", "python")
 * @clientName("nameForCsharp", "csharp")
 * @clientName("nameForJavascript", "javascript")
 * op nameInService: void;
 * ```
 */
export type ClientNameDecorator = (
  context: DecoratorContext,
  target: Type,
  rename: string,
  scope?: string,
) => void;

/**
 * Whether you want to generate an operation as a convenient operation.
 *
 * @param value Whether to generate the operation as convenience method or not.
 * @param scope The language scope you want this decorator to apply to. If not specified, will apply to all language emitters.
 * You can use "!" to specify negation such as "!(java, python)" or "!java, !python".
 * @example
 * ```typespec
 * @convenientAPI(false)
 * op test: void;
 * ```
 */
export type ConvenientAPIDecorator = (
  context: DecoratorContext,
  target: Operation,
  value?: boolean,
  scope?: string,
) => void;

/**
 * Whether you want to generate an operation as a protocol operation.
 *
 * @param value Whether to generate the operation as protocol or not.
 * @param scope The language scope you want this decorator to apply to. If not specified, will apply to all language emitters.
 * You can use "!" to specify negation such as "!(java, python)" or "!java, !python".
 * @example
 * ```typespec
 * @protocolAPI(false)
 * op test: void;
 * ```
 */
export type ProtocolAPIDecorator = (
  context: DecoratorContext,
  target: Operation,
  value?: boolean,
  scope?: string,
) => void;

/**
 * Create a ClientGenerator.Core client out of a namespace or interface
 *
 * @param value Optional configuration for the service.
 * @param scope The language scope you want this decorator to apply to. If not specified, will apply to all language emitters.
 * You can use "!" to specify negation such as "!(java, python)" or "!java, !python".
 * @example Basic client setting
 * ```typespec
 * @client
 * namespace MyService {}
 * ```
 * @example Setting with other service
 * ```typespec
 * namespace MyService {}
 *
 * @client({service: MyService})
 * interface MyInterface {}
 * ```
 * @example Changing client name if you don't want <Interface/Namespace>Client
 * ```typespec
 * @client({client: MySpecialClient})
 * interface MyInterface {}
 * ```
 * @example
 *
 *
 */
export type ClientDecorator = (
  context: DecoratorContext,
  target: Namespace | Interface,
  value?: Model,
  scope?: string,
) => void;

/**
 * Create a ClientGenerator.Core operation group out of a namespace or interface
 *
 * @param scope The language scope you want this decorator to apply to. If not specified, will apply to all language emitters.
 * You can use "!" to specify negation such as "!(java, python)" or "!java, !python".
 * @example
 * ```typespec
 * @operationGroup
 * interface MyInterface{}
 * ```
 */
export type OperationGroupDecorator = (
  context: DecoratorContext,
  target: Namespace | Interface,
  scope?: string,
) => void;

/**
 * Override usage for models/enums.
 * A model/enum's default usage info is always calculated by the operations that use it.
 * You could use this decorator to override the default usage info.
 * When setting usage for namespaces,
 * the usage info will be propagated to the models defined in the namespace.
 * If the model has an usage override, the model override takes precedence.
 * For example, with operation definition `op test(): OutputModel`,
 * the model `OutputModel` has default usage `Usage.output`.
 * After adding decorator `@@usage(OutputModel, Usage.input | Usage.output)`,
 * the final usage result for `OutputModel` is `Usage.input | Usage.output`.
 * The usage info for models will be propagated to models' properties,
 * parent models, discriminated sub models.
 * The override usage should not be narrow than the usage calculated by operation,
 * and different override usage should not conflict with each other,
 * otherwise a warning will be added to diagnostics list.
 *
 * @param value The usage info you want to set for this model.
 * @param scope The language scope you want this decorator to apply to. If not specified, will apply to all language emitters.
 * You can use "!" to specify negation such as "!(java, python)" or "!java, !python".
 * @example Expand usage for model
 * ```typespec
 * op test(): OutputModel;
 *
 * // usage result for `OutputModel` is `Usage.input | Usage.output`
 * @usage(Usage.input)
 * model OutputModel {
 *   prop: string
 * }
 * ```
 * @example Propagation of usage
 * ```typespec
 * // Usage.output
 * @discriminator("kind")
 * model Fish {
 *   age: int32;
 * }
 *
 * // Usage.input | Usage.output
 * @discriminator("sharktype")
 * @usage(Usage.input)
 * model Shark extends Fish {
 *   kind: "shark";
 *   origin: Origin;
 * }
 *
 * // Usage.output
 * model Salmon extends Fish {
 *   kind: "salmon";
 * }
 *
 * // Usage.output
 * model SawShark extends Shark {
 *   sharktype: "saw";
 * }
 *
 * // Usage.output
 * model Origin {
 *   country: string;
 *   city: string;
 *   manufacture: string;
 * }
 *
 * @get
 * op getModel(): Fish;
 * ```
 */
export type UsageDecorator = (
  context: DecoratorContext,
  target: Model | Enum | Union | Namespace,
  value: EnumMember | Union,
  scope?: string,
) => void;

/**
 * Override access for operations, models and enums.
 * When setting access for namespaces,
 * the access info will be propagated to the models and operations defined in the namespace.
 * If the model has an access override, the model override takes precedence.
 * When setting access for an operation,
 * it will influence the access info for models/enums that are used by this operation.
 * Models/enums that are used in any operations with `@access(Access.public)` will be set to access "public"
 * Models/enums that are only used in operations with `@access(Access.internal)` will be set to access "internal".
 * The access info for models will be propagated to models' properties,
 * parent models, discriminated sub models.
 * The override access should not be narrow than the access calculated by operation,
 * and different override access should not conflict with each other,
 * otherwise a warning will be added to diagnostics list.
 *
 * @param value The access info you want to set for this model or operation.
 * @param scope The language scope you want this decorator to apply to. If not specified, will apply to all language emitters.
 * You can use "!" to specify negation such as "!(java, python)" or "!java, !python".
 * @example Set access
 * ```typespec
 * // Access.internal
 * @access(Access.internal)
 * model ModelToHide {
 *   prop: string;
 * }
 * // Access.internal
 * @access(Access.internal)
 * op test: void;
 * ```
 * @example Access propagation
 * ```typespec
 * // Access.internal
 * @discriminator("kind")
 * model Fish {
 *   age: int32;
 * }
 *
 * // Access.internal
 * @discriminator("sharktype")
 * model Shark extends Fish {
 *   kind: "shark";
 *   origin: Origin;
 * }
 *
 * // Access.internal
 * model Salmon extends Fish {
 *   kind: "salmon";
 * }
 *
 * // Access.internal
 * model SawShark extends Shark {
 *   sharktype: "saw";
 * }
 *
 * // Access.internal
 * model Origin {
 *   country: string;
 *   city: string;
 *   manufacture: string;
 * }
 *
 * // Access.internal
 * @get
 * @access(Access.internal)
 * op getModel(): Fish;
 * ```
 * @example Access influence from operation
 * ```typespec
 * // Access.internal
 * model Test1 {
 * }
 *
 * // Access.internal
 * @access(Access.internal)
 * @route("/func1")
 * op func1(
 *   @body body: Test1
 * ): void;
 *
 * // Access.public
 * model Test2 {
 * }
 *
 * // Access.public
 * @route("/func2")
 * op func2(
 *   @body body: Test2
 * ): void;
 *
 * // Access.public
 * model Test3 {
 * }
 *
 * // Access.public
 * @access(Access.public)
 * @route("/func3")
 * op func3(
 *   @body body: Test3
 * ): void;
 *
 * // Access.public
 * model Test4 {
 * }
 *
 * // Access.internal
 * @access(Access.internal)
 * @route("/func4")
 * op func4(
 *   @body body: Test4
 * ): void;
 *
 * // Access.public
 * @route("/func5")
 * op func5(
 *   @body body: Test4
 * ): void;
 *
 * // Access.public
 * model Test5 {
 * }
 *
 * // Access.internal
 * @access(Access.internal)
 * @route("/func6")
 * op func6(
 *   @body body: Test5
 * ): void;
 *
 * // Access.public
 * @route("/func7")
 * op func7(
 *   @body body: Test5
 * ): void;
 *
 * // Access.public
 * @access(Access.public)
 * @route("/func8")
 * op func8(
 *   @body body: Test5
 * ): void;
 * ```
 */
export type AccessDecorator = (
  context: DecoratorContext,
  target: Model | Operation | Enum | Union | Namespace,
  value: EnumMember,
  scope?: string,
) => void;

/**
 * Set whether a model property should be flattened or not.
 *
 * @param scope The language scope you want this decorator to apply to. If not specified, will apply to all language emitters.
 * You can use "!" to specify negation such as "!(java, python)" or "!java, !python".
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
 * Override the default client method generated by TCGC from your service definition
 *
 * @param original : The original service definition
 * @param override : The override method definition that specifies the exact client method you want
 * @param scope The language scope you want this decorator to apply to. If not specified, will apply to all language emitters.
 * You can use "!" to specify negation such as "!(java, python)" or "!java, !python".
 * @example
 * ```typespec
 * // main.tsp
 * namespace MyService;
 *
 * model Params {
 *  foo: string;
 *  bar: string;
 * }
 * op myOperation(...Params): void; // by default, we generate the method signature as `op myOperation(foo: string, bar: string)`;
 *
 * // client.tsp
 * namespace MyCustomizations;
 *
 * @override(MyService.operation)
 * op myOperationCustomization(params: Params): void;
 *
 * // method signature is now `op myOperation(params: Params)`
 * ```
 * @example
 * ```typespec
 * // main.tsp
 * namespace MyService;
 *
 * model Params {
 *  foo: string;
 *  bar: string;
 * }
 * op myOperation(...Params): void; // by default, we generate the method signature as `op myOperation(foo: string, bar: string)`;
 *
 * // client.tsp
 * namespace MyCustomizations;
 *
 * @override(MyService.operation, "csharp")
 * op myOperationCustomization(params: Params): void;
 *
 * // method signature is now `op myOperation(params: Params)` just for csharp
 * ```
 */
export type OverrideDecorator = (
  context: DecoratorContext,
  original: Operation,
  override: Operation,
  scope?: string,
) => void;

/**
 * Whether a model needs the custom JSON converter, this is only used for backward compatibility for csharp.
 *
 * @param scope The language scope you want this decorator to apply to. If not specified, will apply to all language emitters.
 * You can use "!" to specify negation such as "!(java, python)" or "!java, !python".
 * @example
 * ```typespec
 * @useSystemTextJsonConverter
 * model MyModel {
 *   prop: string;
 * }
 * ```
 */
export type UseSystemTextJsonConverterDecorator = (
  context: DecoratorContext,
  target: Model,
  scope?: string,
) => void;

/**
 * Client parameters you would like to add to the client. By default, we apply endpoint, credential, and api-version parameters. If you add clientInitialization, we will append those to the default list of parameters.
 *
 * @param scope The language scope you want this decorator to apply to. If not specified, will apply to all language emitters.
 * You can use "!" to specify negation such as "!(java, python)" or "!java, !python".
 * @example
 * ```typespec
 * // main.tsp
 * namespace MyService;
 *
 * op upload(blobName: string): void;
 * op download(blobName: string): void;
 *
 * // client.tsp
 * namespace MyCustomizations;
 * model MyServiceClientOptions {
 *   blobName: string;
 * }
 *
 * @@clientInitialization(MyService, {parameters: MyServiceClientOptions})
 * // The generated client will have `blobName` on it. We will also
 * // elevate the existing `blobName` parameter to the client level.
 * ```
 */
export type ClientInitializationDecorator = (
  context: DecoratorContext,
  target: Namespace | Interface,
  options: Type,
  scope?: string,
) => void;

/**
 * Alias the name of a client parameter to a different name. This permits you to have a different name for the parameter in client initialization then on individual methods and still refer to the same parameter.
 *
 * @param scope The language scope you want this decorator to apply to. If not specified, will apply to all language emitters.
 * You can use "!" to specify negation such as "!(java, python)" or "!java, !python".
 * @example
 * ```typespec
 * // main.tsp
 * namespace MyService;
 *
 * op upload(blobName: string): void;
 *
 * // client.tsp
 * namespace MyCustomizations;
 * model MyServiceClientOptions {
 *   blob: string;
 * }
 *
 * @@clientInitialization(MyService, MyServiceClientOptions)
 * @@paramAlias(MyServiceClientOptions.blob, "blobName")
 *
 * // The generated client will have `blobName` on it. We will also
 * // elevate the existing `blob` parameter to the client level.
 * ```
 */
export type ParamAliasDecorator = (
  context: DecoratorContext,
  original: ModelProperty,
  paramAlias: string,
  scope?: string,
) => void;

/**
 * Changes the namespace of a client, model, enum or union generated in the client SDK.
 * By default, the client namespace for them will follow the TypeSpec namespace.
 *
 * @param rename The rename you want applied to the object
 * @param scope The language scope you want this decorator to apply to. If not specified, will apply to all language emitters.
 * You can use "!" to specify negation such as "!(java, python)" or "!java, !python".
 * @example
 * ```typespec
 * @clientNamespace("ContosoClient")
 * namespace Contoso;
 * ```
 * @example
 * ```typespec
 * @clientNamespace("ContosoJava", "java")
 * @clientNamespace("ContosoPython", "python")
 * @clientNamespace("ContosoCSharp", "csharp")
 * @clientNamespace("ContosoJavascript", "javascript")
 * namespace Contoso;
 * ```
 */
export type ClientNamespaceDecorator = (
  context: DecoratorContext,
  target: Namespace | Interface | Model | Enum | Union,
  rename: string,
  scope?: string,
) => void;

/**
 * Set an alternate type for a model property, scalar, or function parameter. Note that `@encode` will be overridden by the one defined in alternate type.
 *
 * @param source The source type you want to apply the alternate type to. Only scalar types are supported.
 * @param alternate The alternate type you want applied to the target. Only scalar types are supported.
 * @param scope The language scope you want this decorator to apply to. If not specified, will apply to all language emitters.
 * You can use "!" to specify negation such as "!(java, python)" or "!java, !python".
 * @example
 * ```typespec
 * model Foo {
 *    date: utcDateTime;
 * }
 * @@alternateType(Foo.date, string);
 * ```
 * @example
 * ```typespec
 * scalar storageDateTime extends utcDataTime;
 * @@alternateType(storageDateTime, string, "python");
 * ```
 * @example
 * ```typespec
 * op test(@param @alternateType(string) date: utcDateTime): void;
 * ```
 */
export type AlternateTypeDecorator = (
  context: DecoratorContext,
  source: ModelProperty | Scalar,
  alternate: Scalar,
  scope?: string,
) => void;

/**
 * To define the client scope of an operation.
 *
 * @param scope The language scope you want this decorator to apply to. If not specified, will apply to all language emitters.
 * You can use "!" to specify negation such as "!(java, python)" or "!java, !python".
 * @example
 * ```typespec
 * @scope("!csharp")
 * op test: void;
 * ```
 */
export type ScopeDecorator = (context: DecoratorContext, target: Operation, scope?: string) => void;

/**
 * Use to override default assumptions on whether a parameter is an api-version parameter or not.
 * By default, we do matches with the `api-version` or `apiversion` string in the parameter name. Since api versions are
 * a client parameter, we will also elevate this parameter up onto the client.
 *
 * @param value If true, we will treat this parameter as an api-version parameter. If false, we will not. Default is true.
 * @param scope The language scope you want this decorator to apply to. If not specified, will apply to all language emitters.
 * You can use "!" to specify negation such as "!(java, python)" or "!java, !python".
 * @example
 * ```typespec
 * namespace Contoso;
 *
 * op test(
 *   @apiVersion
 *   @header("x-ms-version")
 *   version: string
 * ): void;
 * ```
 */
export type ApiVersionDecorator = (
  context: DecoratorContext,
  target: ModelProperty,
  value?: boolean,
  scope?: string,
) => void;

export type AzureClientGeneratorCoreDecorators = {
  clientName: ClientNameDecorator;
  convenientAPI: ConvenientAPIDecorator;
  protocolAPI: ProtocolAPIDecorator;
  client: ClientDecorator;
  operationGroup: OperationGroupDecorator;
  usage: UsageDecorator;
  access: AccessDecorator;
  flattenProperty: FlattenPropertyDecorator;
  override: OverrideDecorator;
  useSystemTextJsonConverter: UseSystemTextJsonConverterDecorator;
  clientInitialization: ClientInitializationDecorator;
  paramAlias: ParamAliasDecorator;
  clientNamespace: ClientNamespaceDecorator;
  alternateType: AlternateTypeDecorator;
  scope: ScopeDecorator;
  apiVersion: ApiVersionDecorator;
};
