import {
  FinalStateValue,
  LroMetadata,
  PagedResultMetadata,
} from "@azure-tools/typespec-azure-core";
import {
  DateTimeKnownEncoding,
  Diagnostic,
  DurationKnownEncoding,
  EmitContext,
  Interface,
  IntrinsicScalarName,
  Model,
  ModelProperty,
  Namespace,
  Operation,
  PagingOperation,
  Program,
  Type,
  Union,
} from "@typespec/compiler";
import {
  HttpAuth,
  HttpOperation,
  HttpOperationResponse,
  HttpStatusCodeRange,
  HttpVerb,
  Visibility,
} from "@typespec/http";
import { TspLiteralType } from "./internal-utils.js";

// Types for TCGC lib

export interface TCGCContext {
  program: Program;
  diagnostics: readonly Diagnostic[];
  emitterName: string;
  arm?: boolean;
  getMutatedGlobalNamespace(): Namespace;
  __mutatedGlobalNamespace?: Namespace; // the root of all tsp namespaces for this instance. Starting point for traversal, so we don't call mutation multiple times
  namespaceFlag?: string;

  generateProtocolMethods?: boolean;
  generateConvenienceMethods?: boolean;
  packageName?: string;
  flattenUnionAsEnum?: boolean;
  apiVersion?: string;
  examplesDir?: string;
  getApiVersionsForType(type: Type): string[];
  setApiVersionsForType(type: Type, apiVersions: string[]): void;

  decoratorsAllowList?: string[];
  previewStringRegex: RegExp;
  disableUsageAccessPropagationToBase: boolean;

  __referencedTypeCache: Map<Type, SdkModelType | SdkEnumType | SdkUnionType | SdkNullableType>;
  __modelPropertyCache: Map<ModelProperty, SdkModelPropertyType>;
  __generatedNames?: Map<Union | Model | TspLiteralType, string>;
  __httpOperationCache: Map<Operation, HttpOperation>;
  __clientToParameters: Map<Interface | Namespace, SdkParameter[]>;
  __tspTypeToApiVersions: Map<Type, string[]>;
  __clientToApiVersionClientDefaultValue: Map<Interface | Namespace, string | undefined>;
  __knownScalars?: Record<string, SdkBuiltInKinds>;
  __rawClients?: SdkClient[];
  __httpOperationExamples?: Map<HttpOperation, SdkHttpOperationExample[]>;
  __originalProgram: Program;
  __pagedResultSet: Set<SdkType>;
}

export interface SdkContext<
  TOptions extends object = Record<string, any>,
  TServiceOperation extends SdkServiceOperation = SdkHttpOperation,
> extends TCGCContext {
  emitContext: EmitContext<TOptions>;
  sdkPackage: SdkPackage<TServiceOperation>;
}

export interface SdkEmitterOptions {
  "generate-protocol-methods"?: boolean;
  "generate-convenience-methods"?: boolean;
  "package-name"?: string;
  "flatten-union-as-enum"?: boolean;
  "api-version"?: string;
  /**
   * @deprecated Use `examples-dir` instead.
   */
  "examples-directory"?: string;
  "examples-dir"?: string;
  "emitter-name"?: string;
  namespace?: string;
}

// Types for TCGC customization decorators

export interface SdkClient {
  kind: "SdkClient";
  name: string;
  service: Namespace;
  type: Namespace | Interface;
  crossLanguageDefinitionId: string;
}

export interface SdkOperationGroup {
  kind: "SdkOperationGroup";
  type: Namespace | Interface;
  subOperationGroups?: SdkOperationGroup[];
  groupPath: string;
  service: Namespace;
}

export type AccessFlags = "internal" | "public";

/**
 * This enum represents the different ways a model can be used in a method.
 */
export enum UsageFlags {
  None = 0,
  Input = 1 << 1,
  Output = 1 << 2,
  ApiVersionEnum = 1 << 3,
  // Input and Json will also be set when JsonMergePatch is set.
  JsonMergePatch = 1 << 4,
  // Input will also be set when MultipartFormData is set.
  MultipartFormData = 1 << 5,
  // Used in spread.
  Spread = 1 << 6,
  /**
   * @deprecated Use `Exception` instead.
   */
  // Output will also be set when Error is set.
  Error = 1 << 7,
  // Set when type is used in conjunction with an application/json content type.
  Json = 1 << 8,
  // Set when type is used in conjunction with an application/xml content type.
  Xml = 1 << 9,
  // Set when type is used for exception output.
  Exception = 1 << 10,
  // Set when type is used as LRO initial response.
  LroInitial = 1 << 11,
  // Set when type is used as LRO polling response.
  LroPolling = 1 << 12,
  // Set when type is used as LRO final envelop response.
  LroFinalEnvelope = 1 << 13,
}

/**
 * Flags used to indicate how a client is initialized.
 * `Individually` means the client is initialized individually.
 * `Parent` means the client is initialized by its parent.
 */
export enum InitializedByFlags {
  Individually = 1 << 0,
  Parent = 1 << 1,
}

/**
 * Options used to indicate how to initialize a client.
 * `parameters` is a model that used to .
 * `initializedBy` is a flag that indicates how the client is initialized.
 */
export interface ClientInitializationOptions {
  parameters?: Model;
  initializedBy?: InitializedByFlags;
}

// Types for TCGC specific type  graph

interface DecoratedType {
  // Client types sourced from TypeSpec decorated types will have this generic decoratores list.
  // Only decorators in allowed list will be included in this list.
  // Language's emitter could set `additionalDecorators` in the option when `createSdkContext` to extend the allowed list.
  decorators: DecoratorInfo[];
}

export interface DecoratorInfo {
  // Fully qualified name of the decorator. For example, `TypeSpec.@encode`, `TypeSpec.Xml.@attribute`.
  name: string;
  // A dict of the decorator's arguments. For example, `{ encoding: "base64url" }`.
  arguments: Record<string, any>;
}
export interface SdkClientType<TServiceOperation extends SdkServiceOperation>
  extends DecoratedType {
  __raw: SdkClient | SdkOperationGroup;
  kind: "client";
  name: string;
  /**
   * @deprecated Use `namespace` instead.
   */
  clientNamespace: string;
  /**
   * Full qualified namespace.
   */
  namespace: string;
  doc?: string;
  summary?: string;
  /**
   * @deprecated Use `clientInitialization.paramters` instead.
   */
  initialization: SdkInitializationType;
  clientInitialization: SdkClientInitializationType;
  methods: SdkMethod<TServiceOperation>[];
  apiVersions: string[];
  /**
   * @deprecated Use `clientNamespace` instead.
   */
  nameSpace: string; // fully qualified
  crossLanguageDefinitionId: string;
  // The parent client of this client. The structure follows the definition hierarchy.
  parent?: SdkClientType<TServiceOperation>;
  // The children of this client. The structure follows the definition hierarchy.
  children?: SdkClientType<TServiceOperation>[];
}

interface SdkTypeBase extends DecoratedType {
  __raw?: Type;
  kind: string;
  deprecation?: string;
  doc?: string;
  summary?: string;
  __accessSet?: boolean;
}

export type SdkType =
  | SdkBuiltInType
  | SdkDateTimeType
  | SdkDurationType
  | SdkArrayType
  | SdkTupleType
  | SdkDictionaryType
  | SdkNullableType
  | SdkEnumType
  | SdkEnumValueType
  | SdkConstantType
  | SdkUnionType
  | SdkModelType
  | SdkCredentialType
  | SdkEndpointType;

export interface SdkBuiltInType<TKind extends SdkBuiltInKinds = SdkBuiltInKinds>
  extends SdkTypeBase {
  kind: TKind;
  encode?: string;
  name: string;
  baseType?: SdkBuiltInType<TKind>;
  crossLanguageDefinitionId: string;
}

type TypeEquality<T, U> = keyof T extends keyof U
  ? keyof U extends keyof T
    ? true
    : false
  : false;

// these two vars are used to validate whether our SdkBuiltInKinds are exhaustive for all possible values from typespec
// if it is not, a typescript compilation error will be thrown here.
const _: TypeEquality<Exclude<SupportedBuiltInKinds, SdkBuiltInKinds>, never> = true;
const __: TypeEquality<Exclude<SdkBuiltInKinds, SupportedBuiltInKinds>, never> = true;

type SupportedBuiltInKinds =
  | keyof typeof SdkIntKindsEnum
  | keyof typeof SdkFloatingPointKindsEnum
  | keyof typeof SdkFixedPointKindsEnum
  | keyof typeof SdkGenericBuiltInStringKindsEnum
  | keyof typeof SdkBuiltInKindsMiscellaneousEnum;

enum SdkIntKindsEnum {
  numeric = "numeric",
  integer = "integer",
  safeint = "safeint",
  int8 = "int8",
  int16 = "int16",
  int32 = "int32",
  int64 = "int64",
  uint8 = "uint8",
  uint16 = "uint16",
  uint32 = "uint32",
  uint64 = "uint64",
}

enum SdkFloatingPointKindsEnum {
  float = "float",
  float32 = "float32",
  float64 = "float64",
}

enum SdkFixedPointKindsEnum {
  decimal = "decimal",
  decimal128 = "decimal128",
}

enum SdkGenericBuiltInStringKindsEnum {
  string = "string",
  url = "url",
}

enum SdkBuiltInKindsMiscellaneousEnum {
  bytes = "bytes",
  boolean = "boolean",
  plainDate = "plainDate",
  plainTime = "plainTime",
  unknown = "unknown",
}

export type SdkBuiltInKinds = Exclude<IntrinsicScalarName, SdkBuiltInKindsExcludes> | "unknown";

type SdkBuiltInKindsExcludes = "utcDateTime" | "offsetDateTime" | "duration";

export function getKnownScalars(): Record<string, SdkBuiltInKinds> {
  const retval: Record<string, SdkBuiltInKinds> = {};
  const typespecNamespace = Object.keys(SdkBuiltInKindsMiscellaneousEnum)
    .concat(Object.keys(SdkIntKindsEnum))
    .concat(Object.keys(SdkFloatingPointKindsEnum))
    .concat(Object.keys(SdkFixedPointKindsEnum))
    .concat(Object.keys(SdkGenericBuiltInStringKindsEnum));
  for (const kind of typespecNamespace) {
    if (!isSdkBuiltInKind(kind)) continue; // it will always be true
    retval[`TypeSpec.${kind}`] = kind;
  }
  return retval;
}

export function isSdkBuiltInKind(kind: string): kind is SdkBuiltInKinds {
  return (
    kind in SdkBuiltInKindsMiscellaneousEnum ||
    isSdkIntKind(kind) ||
    isSdkFloatKind(kind) ||
    isSdkFixedPointKind(kind) ||
    kind in SdkGenericBuiltInStringKindsEnum
  );
}

export function isSdkIntKind(kind: string): kind is keyof typeof SdkIntKindsEnum {
  return kind in SdkIntKindsEnum;
}

export function isSdkFloatKind(kind: string): kind is keyof typeof SdkFloatingPointKindsEnum {
  return kind in SdkFloatingPointKindsEnum;
}

function isSdkFixedPointKind(kind: string): kind is keyof typeof SdkFixedPointKindsEnum {
  return kind in SdkFixedPointKindsEnum;
}

const SdkDateTimeEncodingsConst = ["rfc3339", "rfc7231", "unixTimestamp"] as const;

export function isSdkDateTimeEncodings(encoding: string): encoding is DateTimeKnownEncoding {
  return SdkDateTimeEncodingsConst.includes(encoding as DateTimeKnownEncoding);
}

interface SdkDateTimeTypeBase extends SdkTypeBase {
  name: string;
  baseType?: SdkDateTimeType;
  encode: DateTimeKnownEncoding;
  wireType: SdkBuiltInType;
  crossLanguageDefinitionId: string;
}

interface SdkUtcDateTimeType extends SdkDateTimeTypeBase {
  kind: "utcDateTime";
}

interface SdkOffsetDateTimeType extends SdkDateTimeTypeBase {
  kind: "offsetDateTime";
}

export type SdkDateTimeType = SdkUtcDateTimeType | SdkOffsetDateTimeType;

export interface SdkDurationType extends SdkTypeBase {
  kind: "duration";
  name: string;
  baseType?: SdkDurationType;
  encode: DurationKnownEncoding;
  wireType: SdkBuiltInType;
  crossLanguageDefinitionId: string;
}

export interface SdkArrayType extends SdkTypeBase {
  kind: "array";
  name: string;
  valueType: SdkType;
  crossLanguageDefinitionId: string;
}

export interface SdkTupleType extends SdkTypeBase {
  kind: "tuple";
  valueTypes: SdkType[];
}

export interface SdkDictionaryType extends SdkTypeBase {
  kind: "dict";
  keyType: SdkType;
  valueType: SdkType;
}

export interface SdkNullableType extends SdkTypeBase {
  kind: "nullable";
  name: string;
  isGeneratedName: boolean;
  crossLanguageDefinitionId: string;
  type: SdkType;
  usage: UsageFlags;
  access: AccessFlags;
  /**
   * @deprecated Use `namespace` instead.
   */
  clientNamespace: string;
  /**
   * Full qualified namespace.
   */
  namespace: string;
}

export interface SdkEnumType extends SdkTypeBase {
  kind: "enum";
  name: string;
  isGeneratedName: boolean;
  /**
   * @deprecated Use `namespace` instead.
   */
  clientNamespace: string;
  /**
   * Full qualified namespace.
   */
  namespace: string;
  valueType: SdkBuiltInType;
  values: SdkEnumValueType[];
  isFixed: boolean;
  isFlags: boolean;
  usage: UsageFlags;
  access: AccessFlags;
  crossLanguageDefinitionId: string;
  apiVersions: string[];
  isUnionAsEnum: boolean;
}

export interface SdkEnumValueType<TValueType extends SdkTypeBase = SdkBuiltInType>
  extends SdkTypeBase {
  kind: "enumvalue";
  name: string;
  value: string | number;
  enumType: SdkEnumType;
  valueType: TValueType;
}

export interface SdkConstantType extends SdkTypeBase {
  kind: "constant";
  value: string | number | boolean;
  valueType: SdkBuiltInType;
  name: string;
  isGeneratedName: boolean;
}

export interface SdkUnionType<TValueType extends SdkTypeBase = SdkType> extends SdkTypeBase {
  name: string;
  isGeneratedName: boolean;
  /**
   * @deprecated Use `namespace` instead.
   */
  clientNamespace: string;
  /**
   * Full qualified namespace.
   */
  namespace: string;
  kind: "union";
  variantTypes: TValueType[];
  crossLanguageDefinitionId: string;
  access: AccessFlags;
  usage: UsageFlags;
}

export interface SdkModelType extends SdkTypeBase {
  kind: "model";
  properties: SdkModelPropertyType[];
  name: string;
  isGeneratedName: boolean;
  /**
   * @deprecated Use `namespace` instead.
   */
  clientNamespace: string;
  /**
   * Full qualified namespace.
   */
  namespace: string;
  access: AccessFlags;
  usage: UsageFlags;
  additionalProperties?: SdkType;
  discriminatorValue?: string;
  discriminatedSubtypes?: Record<string, SdkModelType>;
  discriminatorProperty?: SdkModelPropertyType;
  baseModel?: SdkModelType;
  crossLanguageDefinitionId: string;
  apiVersions: string[];
  serializationOptions: SerializationOptions;
}

export interface SdkInitializationType extends SdkModelType {
  properties: SdkParameter[];
}

export interface SdkClientInitializationType extends SdkTypeBase {
  kind: "clientinitialization";
  name: string;
  isGeneratedName: boolean;
  parameters: SdkParameter[];
  initializedBy: InitializedByFlags;
}

export interface SdkCredentialType extends SdkTypeBase {
  kind: "credential";
  scheme: HttpAuth;
}

export interface SdkEndpointType extends SdkTypeBase {
  kind: "endpoint";
  serverUrl: string; // if not specified, we will use value "{endpoint}", and templateArguments will have one parameter called "endpoint"
  templateArguments: SdkPathParameter[];
}

export interface SdkModelPropertyTypeBase<TType extends SdkTypeBase = SdkType>
  extends DecoratedType {
  __raw?: ModelProperty;
  type: TType;
  name: string;
  isGeneratedName: boolean;
  doc?: string;
  summary?: string;
  apiVersions: string[];
  onClient: boolean;
  clientDefaultValue?: unknown;
  /**
   * @deprecated This property is deprecated. See if the kind is `apiVersion` instead
   */
  isApiVersionParam: boolean;
  optional: boolean;
  crossLanguageDefinitionId: string;
  visibility?: Visibility[];
}

/**
 * Options to show how to serialize a model/property.
 * A model/property that is used in multiple operations with different wire format could have multiple options set. For example, a model could be serialized as JSON in one operation and as XML in another operation.
 * A model/property that has no special serialization logic will have no options set. For example, a property that is used in a HTTP query parameter will have no serialization options set.
 * A model/property that is used as binary payloads will also have no options set. For example, a property that is used as a HTTP request body with `"image/png` content type.
 */
export interface SerializationOptions {
  json?: JsonSerializationOptions;
  xml?: XmlSerializationOptions;
  multipart?: MultipartOptions;
}

/**
 * For Json serialization.
 * The name will come from explicit setting of `@encodedName("application/json", "NAME")` or original model/property name.
 */
export interface JsonSerializationOptions {
  name: string;
}

/**
 * For Xml serialization.
 * The `name`/`itemsName` will come from explicit setting of `@encodedName("application/xml", "NAME")` or `@xml.Name("NAME")` or original model/property name.
 * Other properties come from `@xml.attribute`, `@xml.ns`, `@xml.unwrapped`.
 * The `itemsName` and `itemsNs` are used for array items.
 * If `unwrapped` is `true`, `itemsName` should always be same as the `name`. If `unwrapped` is `false`, `itemsName` could have different name.
 */
export interface XmlSerializationOptions {
  name: string;
  attribute?: boolean;
  ns?: {
    namespace: string;
    prefix: string;
  };
  unwrapped?: boolean;

  itemsName?: string;
  itemsNs?: {
    namespace: string;
    prefix: string;
  };
}

export interface SdkEndpointParameter
  extends SdkModelPropertyTypeBase<SdkEndpointType | SdkUnionType<SdkEndpointType>> {
  kind: "endpoint";
  urlEncode: boolean;
  onClient: true;
  /**
   * @deprecated This property is deprecated. Use `type.templateArguments[x].serializedName` or `type.variantTypes[x].templateArguments[x].serializedName` instead.
   */
  serializedName?: string;
}

export interface SdkApiVersionParameter
  extends SdkModelPropertyTypeBase<
    SdkBuiltInType<"string"> | SdkEnumValueType<SdkBuiltInType<"string">>
  > {
  kind: "apiVersion";
  onClient: true;
  type: SdkBuiltInType<"string"> | SdkEnumValueType<SdkBuiltInType<"string">>;
  isApiVersionParam: true;
}

export interface SdkCredentialParameter
  extends SdkModelPropertyTypeBase<SdkCredentialType | SdkUnionType<SdkCredentialType>> {
  kind: "credential";
  onClient: true;
}

export type SdkModelPropertyType<TType extends SdkTypeBase = SdkType> =
  | SdkBodyModelPropertyType<TType>
  | SdkParameter<TType>
  | SdkEndpointParameter
  | SdkCredentialParameter
  | SdkApiVersionParameter
  | SdkQueryParameter<TType>
  | SdkPathParameter<TType>
  | SdkBodyParameter<TType>
  | SdkHeaderParameter<TType>
  | SdkCookieParameter<TType>
  | SdkServiceResponseHeader<TType>;

export interface MultipartOptions {
  name: string;
  // whether this part is for file
  isFilePart: boolean;
  // whether this part is multi in request payload
  isMulti: boolean;
  // undefined if filename is not set explicitly in Typespec
  filename?: SdkModelPropertyType;
  // undefined if contentType is not set explicitly in Typespec
  contentType?: SdkModelPropertyType;
  // defined in Typespec or calculated by Typespec complier
  defaultContentTypes: string[];
}

export interface SdkBodyModelPropertyType<TType extends SdkTypeBase = SdkType>
  extends SdkModelPropertyTypeBase<TType> {
  kind: "property";
  discriminator: boolean;
  /**
   * @deprecated This property is deprecated. Use `serializationOptions.xxx.name` instead.
   */
  serializedName: string;
  serializationOptions: SerializationOptions;
  /**
   * @deprecated This property is deprecated. Use `multipartOptions?.isFilePart` instead.
   */
  isMultipartFileInput: boolean;
  /**
   * @deprecated This property is deprecated. Use `serializationOptions.multipart` instead.
   */
  multipartOptions?: MultipartOptions;
  flatten: boolean;
}

export type CollectionFormat = "multi" | "csv" | "ssv" | "tsv" | "pipes" | "simple" | "form";

export interface SdkHeaderParameter<TType extends SdkTypeBase = SdkType>
  extends SdkModelPropertyTypeBase<TType> {
  kind: "header";
  collectionFormat?: CollectionFormat;
  serializedName: string;
  correspondingMethodParams: SdkModelPropertyType[];
}

export interface SdkQueryParameter<TType extends SdkTypeBase = SdkType>
  extends SdkModelPropertyTypeBase<TType> {
  kind: "query";
  collectionFormat?: CollectionFormat;
  serializedName: string;
  correspondingMethodParams: SdkModelPropertyType[];
  explode: boolean;
}

export interface SdkPathParameter<TType extends SdkTypeBase = SdkType>
  extends SdkModelPropertyTypeBase<TType> {
  kind: "path";
  /**
   * @deprecated This property is deprecated. Use `allowReserved` instead.
   * @param serviceParam
   */
  urlEncode: boolean;
  explode: boolean;
  style: "simple" | "label" | "matrix" | "fragment" | "path";
  allowReserved: boolean;
  serializedName: string;
  optional: false;
  correspondingMethodParams: SdkModelPropertyType[];
}

export interface SdkCookieParameter<TType extends SdkTypeBase = SdkType>
  extends SdkModelPropertyTypeBase<TType> {
  kind: "cookie";
  serializedName: string;
  correspondingMethodParams: SdkModelPropertyType[];
}

export interface SdkBodyParameter<TType extends SdkTypeBase = SdkType>
  extends SdkModelPropertyTypeBase<TType> {
  kind: "body";
  serializedName: string;
  optional: boolean;
  contentTypes: string[];
  defaultContentType: string;
  correspondingMethodParams: SdkModelPropertyType[];
}

export type SdkHttpParameter =
  | SdkQueryParameter
  | SdkPathParameter
  | SdkBodyParameter
  | SdkHeaderParameter
  | SdkCookieParameter;

export interface SdkMethodParameter<TType extends SdkTypeBase = SdkType>
  extends SdkModelPropertyTypeBase<TType> {
  kind: "method";
}

export interface SdkServiceResponseHeader<TType extends SdkTypeBase = SdkType>
  extends SdkModelPropertyTypeBase<TType> {
  __raw: ModelProperty;
  kind: "responseheader";
  serializedName: string;
}

export interface SdkMethodResponse {
  kind: "method";
  type?: SdkType;
  /**
   * @deprecated Use `resultSegments` instead.
   */
  resultPath?: string;
  /**
   * An array of properties to fetch {result} from the {response} model. Note that this property is only for LRO and paging pattens.
   */
  resultSegments?: SdkModelPropertyType[];
}

export interface SdkServiceResponse {
  type?: SdkType;
  headers: SdkServiceResponseHeader[];
  apiVersions: string[];
}

interface SdkHttpResponseBase extends SdkServiceResponse {
  __raw: HttpOperationResponse;
  kind: "http";
  contentTypes?: string[];
  defaultContentType?: string;
  description?: string;
}

export interface SdkHttpResponse extends SdkHttpResponseBase {
  statusCodes: number | HttpStatusCodeRange;
}

export interface SdkHttpErrorResponse extends SdkHttpResponseBase {
  statusCodes: number | HttpStatusCodeRange | "*";
}

interface SdkServiceOperationBase {}

export type SdkParameter<TType extends SdkTypeBase = SdkType> =
  | SdkEndpointParameter
  | SdkCredentialParameter
  | SdkApiVersionParameter
  | SdkMethodParameter<TType>;

export interface SdkHttpOperation extends SdkServiceOperationBase {
  __raw: HttpOperation;
  kind: "http";
  path: string;
  uriTemplate: string;
  verb: HttpVerb;
  parameters: (SdkPathParameter | SdkQueryParameter | SdkHeaderParameter | SdkCookieParameter)[];
  bodyParam?: SdkBodyParameter;
  responses: SdkHttpResponse[];
  exceptions: SdkHttpErrorResponse[];
  examples?: SdkHttpOperationExample[];
}

/**
 * We eventually will include other kinds of service operations, i.e. grpc. For now, it's just Http.
 */

export type SdkServiceOperation = SdkHttpOperation;
export type SdkServiceParameter = SdkHttpParameter;

interface SdkMethodBase extends DecoratedType {
  __raw?: Operation;
  name: string;
  access: AccessFlags;
  parameters: SdkParameter[];
  apiVersions: string[];
  doc?: string;
  summary?: string;
  crossLanguageDefinitionId: string;
}

interface SdkServiceMethodBase<TServiceOperation extends SdkServiceOperation>
  extends SdkMethodBase {
  operation: TServiceOperation;
  parameters: SdkMethodParameter[];
  response: SdkMethodResponse;
  exception?: SdkMethodResponse;
  generateConvenient: boolean;
  generateProtocol: boolean;
  isOverride: boolean;
}

export interface SdkBasicServiceMethod<TServiceOperation extends SdkServiceOperation>
  extends SdkServiceMethodBase<TServiceOperation> {
  kind: "basic";
}

interface SdkPagingServiceMethodOptions<TServiceOperation extends SdkServiceOperation> {
  /**
   * @deprecated Use `pagingMetadata.__raw` instead.
   */
  __raw_paged_metadata?: PagedResultMetadata;
  /**
   * @deprecated Use `pagingMetadata.nextLinkSegments` instead.
   */
  nextLinkPath?: string;
  /**
   * @deprecated Use `pagingMetadata.nextLinkOperation` instead.
   */
  nextLinkOperation?: SdkServiceOperation;
  pagingMetadata: SdkPagingServiceMetadata<TServiceOperation>;
}

/**
 * Paging operation metadata.
 */
export interface SdkPagingServiceMetadata<TServiceOperation extends SdkServiceOperation> {
  /** Paging metadata from TypeSpec core library. */
  __raw?: PagedResultMetadata | PagingOperation;

  /** Segments to indicate how to get next page link value from response. */
  nextLinkSegments?: SdkModelPropertyType[];
  /** Method used to get next page. If not defined, use the initial method. */
  nextLinkOperation?: SdkServiceMethod<TServiceOperation>;
  /** Segments to indicate how to set continuation token for next page request. */
  continuationTokenParameterSegments?: SdkModelPropertyType[];
  /** Segments to indicate how to get continuation token value from response. */
  continuationTokenResponseSegments?: SdkModelPropertyType[];
  /** Segments to indicate how to get page items from response. */
  pageItemsSegments?: SdkModelPropertyType[];
}

export interface SdkPagingServiceMethod<TServiceOperation extends SdkServiceOperation>
  extends SdkServiceMethodBase<TServiceOperation>,
    SdkPagingServiceMethodOptions<TServiceOperation> {
  kind: "paging";
}

interface SdkLroServiceMethodOptions {
  /**
   * @deprecated This property will be removed in future releases. Use `lroMetadata` for synthesized LRO metadata. If you still want to access primitive LRO info, use `lroMetadata.__raw`.
   */
  __raw_lro_metadata: LroMetadata;
  lroMetadata: SdkLroServiceMetadata;
}

/**
 * Long running operation metadata.
 */
export interface SdkLroServiceMetadata {
  /** LRO metadata from TypeSpec core library */
  __raw: LroMetadata;

  /** Legacy `finalStateVia` value */
  finalStateVia: FinalStateValue;
  /** Polling step metadata */
  pollingStep: SdkLroServicePollingStep;
  /** Final step metadata */
  finalStep?: SdkLroServiceFinalStep;
  /** Synthesized final response metadata */
  finalResponse?: SdkLroServiceFinalResponse;
}

/**
 * Long running operation polling step metadata.
 */
export interface SdkLroServicePollingStep {
  /** Response body type */
  responseBody?: SdkModelType;
}

/**
 * Long running operation final step metadata.
 */
export interface SdkLroServiceFinalStep {
  /** Final step kind */
  kind:
    | "finalOperationLink"
    | "finalOperationReference"
    | "pollingSuccessProperty"
    | "noPollingResult";
}

/**
 * Synthesized long running operation response metadata.
 */
export interface SdkLroServiceFinalResponse {
  /** Intact response type */
  envelopeResult: SdkModelType;
  /** Meaningful result type */
  result: SdkModelType;
  /**
   * Property path to fetch {result} from {envelopeResult}. Note that this property is available only in some LRO patterns.
   *
   * @deprecated This property will be removed in future releases. Use `resultSegments` for synthesized property information.
   */
  resultPath?: string;
  /** An array of properties to fetch {result} from the {envelopeResult} model. */
  resultSegments?: SdkModelPropertyType[];
}

export interface SdkLroServiceMethod<TServiceOperation extends SdkServiceOperation>
  extends SdkServiceMethodBase<TServiceOperation>,
    SdkLroServiceMethodOptions {
  kind: "lro";
}

export interface SdkLroPagingServiceMethod<TServiceOperation extends SdkServiceOperation>
  extends SdkServiceMethodBase<TServiceOperation>,
    SdkLroServiceMethodOptions,
    SdkPagingServiceMethodOptions<TServiceOperation> {
  kind: "lropaging";
}

export type SdkServiceMethod<TServiceOperation extends SdkServiceOperation> =
  | SdkBasicServiceMethod<TServiceOperation>
  | SdkPagingServiceMethod<TServiceOperation>
  | SdkLroServiceMethod<TServiceOperation>
  | SdkLroPagingServiceMethod<TServiceOperation>;

/**
 * @deprecated Use `parent` and `children` property from `SdkClientType` to find client hierarchy instead.
 */
export interface SdkClientAccessor<TServiceOperation extends SdkServiceOperation>
  extends SdkMethodBase {
  kind: "clientaccessor";
  response: SdkClientType<TServiceOperation>;
}

export type SdkMethod<TServiceOperation extends SdkServiceOperation> =
  | SdkServiceMethod<TServiceOperation>
  | SdkClientAccessor<TServiceOperation>; // eslint-disable-line @typescript-eslint/no-deprecated

export interface SdkPackage<TServiceOperation extends SdkServiceOperation> {
  name: string;
  /**
   * @deprecated Look at `.namespaces` instead
   */
  rootNamespace: string;
  clients: SdkClientType<TServiceOperation>[];
  models: SdkModelType[];
  enums: SdkEnumType[];
  unions: (SdkUnionType | SdkNullableType)[];
  crossLanguagePackageId: string;
  namespaces: SdkNamespace<TServiceOperation>[];
}

export interface SdkNamespace<TServiceOperation extends SdkServiceOperation> {
  name: string;
  fullName: string;
  clients: SdkClientType<TServiceOperation>[];
  models: SdkModelType[];
  enums: SdkEnumType[];
  unions: (SdkUnionType | SdkNullableType)[];
  namespaces: SdkNamespace<TServiceOperation>[];
}

export type SdkHttpPackage = SdkPackage<SdkHttpOperation>;

export type LanguageScopes = "dotnet" | "java" | "python" | "javascript" | "go" | string;

interface SdkExampleBase {
  kind: string;
  name: string;
  /**
   * @deprecated Use `doc` instead.
   */
  description: string;
  doc: string;
  filePath: string;
  rawExample: any;
}

export interface SdkHttpOperationExample extends SdkExampleBase {
  kind: "http";
  parameters: SdkHttpParameterExampleValue[];
  responses: SdkHttpResponseExampleValue[];
}

export interface SdkHttpParameterExampleValue {
  parameter: SdkHttpParameter;
  value: SdkExampleValue;
}

export interface SdkHttpResponseExampleValue {
  response: SdkHttpResponse;
  statusCode: number;
  headers: SdkHttpResponseHeaderExampleValue[];
  bodyValue?: SdkExampleValue;
}

export interface SdkHttpResponseHeaderExampleValue {
  header: SdkServiceResponseHeader;
  value: SdkExampleValue;
}

export type SdkExampleValue =
  | SdkStringExampleValue
  | SdkNumberExampleValue
  | SdkBooleanExampleValue
  | SdkNullExampleValue
  | SdkUnknownExampleValue
  | SdkArrayExampleValue
  | SdkDictionaryExampleValue
  | SdkUnionExampleValue
  | SdkModelExampleValue;

interface SdkExampleValueBase {
  kind: string;
  type: SdkType;
  value: unknown;
}

export interface SdkStringExampleValue extends SdkExampleValueBase {
  kind: "string";
  type:
    | SdkBuiltInType
    | SdkDateTimeType
    | SdkDurationType
    | SdkEnumType
    | SdkEnumValueType
    | SdkConstantType;
  value: string;
}

export interface SdkNumberExampleValue extends SdkExampleValueBase {
  kind: "number";
  type:
    | SdkBuiltInType
    | SdkDateTimeType
    | SdkDurationType
    | SdkEnumType
    | SdkEnumValueType
    | SdkConstantType;
  value: number;
}

export interface SdkBooleanExampleValue extends SdkExampleValueBase {
  kind: "boolean";
  type: SdkBuiltInType | SdkConstantType;
  value: boolean;
}

export interface SdkNullExampleValue extends SdkExampleValueBase {
  kind: "null";
  type: SdkNullableType;
  value: null;
}

export interface SdkUnknownExampleValue extends SdkExampleValueBase {
  kind: "unknown";
  type: SdkBuiltInType;
  value: unknown;
}

export interface SdkArrayExampleValue extends SdkExampleValueBase {
  kind: "array";
  type: SdkArrayType;
  value: SdkExampleValue[];
}

export interface SdkDictionaryExampleValue extends SdkExampleValueBase {
  kind: "dict";
  type: SdkDictionaryType;
  value: Record<string, SdkExampleValue>;
}

export interface SdkUnionExampleValue extends SdkExampleValueBase {
  kind: "union";
  type: SdkUnionType;
  value: unknown;
}

export interface SdkModelExampleValue extends SdkExampleValueBase {
  kind: "model";
  type: SdkModelType;
  value: Record<string, SdkExampleValue>;
  additionalPropertiesValue?: Record<string, SdkExampleValue>;
}
