import { LroMetadata, PagedResultMetadata } from "@azure-tools/typespec-azure-core";
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
  Program,
  ProjectedProgram,
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

export interface TCGCContext {
  program: Program;
  emitterName: string;
  generateProtocolMethods?: boolean;
  generateConvenienceMethods?: boolean;
  filterOutCoreModels?: boolean;
  packageName?: string;
  flattenUnionAsEnum?: boolean;
  arm?: boolean;
  modelsMap?: Map<Type, SdkModelType | SdkEnumType>;
  operationModelsMap?: Map<Operation, Map<Type, SdkModelType | SdkEnumType>>;
  generatedNames?: Map<Union | Model | TspLiteralType, string>;
  spreadModels?: Map<Model, SdkModelType>;
  httpOperationCache?: Map<Operation, HttpOperation>;
  unionsMap?: Map<Union, SdkUnionType>;
  __namespaceToApiVersionParameter: Map<Interface | Namespace, SdkParameter>;
  __tspTypeToApiVersions: Map<Type, string[]>;
  __namespaceToApiVersionClientDefaultValue: Map<Interface | Namespace, string | undefined>;
  knownScalars?: Record<string, SdkBuiltInKinds>;
  diagnostics: readonly Diagnostic[];
  __subscriptionIdParameter?: SdkParameter;
  __rawClients?: SdkClient[];
  apiVersion?: string;
  __service_projection?: Map<Namespace, [Namespace, ProjectedProgram | undefined]>;
  __httpOperationExamples?: Map<HttpOperation, SdkHttpOperationExample[]>;
  originalProgram: Program;
  examplesDir?: string;
  decoratorsAllowList?: string[];
  previewStringRegex: RegExp;
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
  "filter-out-core-models"?: boolean;
  "package-name"?: string;
  "flatten-union-as-enum"?: boolean;
  "api-version"?: string;
  /**
   * @deprecated Use `examples-dir` instead.
   */
  "examples-directory"?: string;
  "examples-dir"?: string;
}

export interface SdkClient {
  kind: "SdkClient";
  name: string;
  service: Namespace;
  type: Namespace | Interface;
  /**
   * @deprecated This property is deprecated. Look at `.arm` on `SdkContext` instead.
   */
  arm: boolean;
  crossLanguageDefinitionId: string;
}

export interface SdkInitializationType extends SdkModelType {
  properties: SdkParameter[];
}

export interface SdkClientType<TServiceOperation extends SdkServiceOperation>
  extends DecoratedType {
  kind: "client";
  name: string;
  description?: string;
  details?: string;
  initialization: SdkInitializationType;
  methods: SdkMethod<TServiceOperation>[];
  apiVersions: string[];
  nameSpace: string; // fully qualified
  crossLanguageDefinitionId: string;
  /**
   * @deprecated This property is deprecated. Look at `.arm` on `SdkContext` instead.
   */
  arm: boolean;
}

export interface SdkOperationGroup {
  kind: "SdkOperationGroup";
  type: Namespace | Interface;
  subOperationGroups?: SdkOperationGroup[];
  groupPath: string;
  service: Namespace;
}

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

interface SdkTypeBase extends DecoratedType {
  __raw?: Type;
  kind: string;
  deprecation?: string;
  description?: string;
  details?: string;
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

export interface SdkBuiltInType extends SdkTypeBase {
  kind: SdkBuiltInKinds;
  encode: string;
  name: string;
  baseType?: SdkBuiltInType;
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
  any = "any",
}

export type SdkBuiltInKinds = Exclude<IntrinsicScalarName, SdkBuiltInKindsExcludes> | "any";

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

/**
 * @deprecated: Use SdkDateTimeType instead.
 */
export type SdkDatetimeType = SdkDateTimeType;

/**
 * @deprecated: Use SdkUtcDateTimeType instead.
 */
export type SdkUtcDatetimeType = SdkUtcDateTimeType;

/**
 * @deprecated Use SdkOffsetDateTimeType instead.
 */
export type SdkOffsetDatetimeType = SdkOffsetDateTimeType;

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
  values: SdkType[];
}

export interface SdkDictionaryType extends SdkTypeBase {
  kind: "dict";
  keyType: SdkType;
  valueType: SdkType;
}

export interface SdkNullableType extends SdkTypeBase {
  kind: "nullable";
  type: SdkType;
}

export interface SdkEnumType extends SdkTypeBase {
  kind: "enum";
  name: string;
  isGeneratedName: boolean;
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

export interface SdkEnumValueType extends SdkTypeBase {
  kind: "enumvalue";
  name: string;
  value: string | number;
  enumType: SdkEnumType;
  valueType: SdkBuiltInType;
}

export interface SdkConstantType extends SdkTypeBase {
  kind: "constant";
  value: string | number | boolean | null;
  valueType: SdkBuiltInType;
  name: string;
  isGeneratedName: boolean;
}

export interface SdkUnionType<TValueType extends SdkTypeBase = SdkType> extends SdkTypeBase {
  name: string;
  isGeneratedName: boolean;
  kind: "union";
  values: TValueType[];
  crossLanguageDefinitionId: string;
}

export type AccessFlags = "internal" | "public";

export interface SdkModelType extends SdkTypeBase {
  kind: "model";
  properties: SdkModelPropertyType[];
  name: string;
  /**
   * @deprecated This property is deprecated. Check the bitwise and value of UsageFlags.MultipartFormData and the `.usage` property on this model.
   */
  isFormDataType: boolean;
  isGeneratedName: boolean;
  access: AccessFlags;
  usage: UsageFlags;
  additionalProperties?: SdkType;
  discriminatorValue?: string;
  discriminatedSubtypes?: Record<string, SdkModelType>;
  discriminatorProperty?: SdkModelPropertyType;
  baseModel?: SdkModelType;
  crossLanguageDefinitionId: string;
  apiVersions: string[];
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

export interface SdkModelPropertyTypeBase extends DecoratedType {
  __raw?: ModelProperty;
  type: SdkType;
  name: string;
  isGeneratedName: boolean;
  description?: string;
  details?: string;
  apiVersions: string[];
  onClient: boolean;
  clientDefaultValue?: any;
  isApiVersionParam: boolean;
  optional: boolean;
  crossLanguageDefinitionId: string;
}

export interface SdkEndpointParameter extends SdkModelPropertyTypeBase {
  kind: "endpoint";
  urlEncode: boolean;
  onClient: true;
  serializedName?: string;
  type: SdkEndpointType | SdkUnionType<SdkEndpointType>;
}

export interface SdkCredentialParameter extends SdkModelPropertyTypeBase {
  kind: "credential";
  type: SdkCredentialType | SdkUnionType<SdkCredentialType>;
  onClient: true;
}

export type SdkModelPropertyType =
  | SdkBodyModelPropertyType
  | SdkParameter
  | SdkEndpointParameter
  | SdkCredentialParameter
  | SdkQueryParameter
  | SdkPathParameter
  | SdkBodyParameter
  | SdkHeaderParameter;

export interface MultipartOptions {
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

export interface SdkBodyModelPropertyType extends SdkModelPropertyTypeBase {
  kind: "property";
  discriminator: boolean;
  serializedName: string;
  /*
    @deprecated This property is deprecated. Use `.multipartOptions?.isFilePart` instead.
  */
  isMultipartFileInput: boolean;
  multipartOptions?: MultipartOptions;
  visibility?: Visibility[];
  flatten: boolean;
}

export type CollectionFormat = "multi" | "csv" | "ssv" | "tsv" | "pipes" | "simple" | "form";

export interface SdkHeaderParameter extends SdkModelPropertyTypeBase {
  kind: "header";
  collectionFormat?: CollectionFormat;
  serializedName: string;
  correspondingMethodParams: SdkModelPropertyType[];
}

export interface SdkQueryParameter extends SdkModelPropertyTypeBase {
  kind: "query";
  collectionFormat?: CollectionFormat;
  serializedName: string;
  correspondingMethodParams: SdkModelPropertyType[];
  explode: boolean;
}

export interface SdkPathParameter extends SdkModelPropertyTypeBase {
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

export interface SdkBodyParameter extends SdkModelPropertyTypeBase {
  kind: "body";
  optional: boolean;
  contentTypes: string[];
  defaultContentType: string;
  correspondingMethodParams: SdkModelPropertyType[];
}

export type SdkHttpParameter =
  | SdkQueryParameter
  | SdkPathParameter
  | SdkBodyParameter
  | SdkHeaderParameter;

export interface SdkMethodParameter extends SdkModelPropertyTypeBase {
  kind: "method";
}

export interface SdkServiceResponseHeader {
  __raw: ModelProperty;
  serializedName: string;
  type: SdkType;
  description?: string;
  details?: string;
}

export interface SdkMethodResponse {
  kind: "method";
  type?: SdkType;
  resultPath?: string; // if exists, tells you how to get from the service response to the method response.
}

export interface SdkServiceResponse {
  type?: SdkType;
  headers: SdkServiceResponseHeader[];
  apiVersions: string[];
}

export interface SdkHttpResponse extends SdkServiceResponse {
  __raw: HttpOperationResponse;
  kind: "http";
  contentTypes?: string[];
  defaultContentType?: string;
  description?: string;
}

interface SdkServiceOperationBase {}

export type SdkParameter = SdkEndpointParameter | SdkCredentialParameter | SdkMethodParameter;

export interface SdkHttpOperation extends SdkServiceOperationBase {
  __raw: HttpOperation;
  kind: "http";
  path: string;
  uriTemplate: string;
  verb: HttpVerb;
  parameters: (SdkPathParameter | SdkQueryParameter | SdkHeaderParameter)[];
  bodyParam?: SdkBodyParameter;
  responses: Map<HttpStatusCodeRange | number, SdkHttpResponse>;
  exceptions: Map<HttpStatusCodeRange | number | "*", SdkHttpResponse>;
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
  description?: string;
  details?: string;
  crossLanguageDefintionId: string;
}

interface SdkServiceMethodBase<TServiceOperation extends SdkServiceOperation>
  extends SdkMethodBase {
  /**
   * @deprecated This property is deprecated. Access .correspondingMethodParams on the service parameters instead.
   * @param serviceParam
   */
  getParameterMapping(serviceParam: SdkServiceParameter): SdkModelPropertyType[];
  operation: TServiceOperation;
  parameters: SdkMethodParameter[];
  /**
   * @deprecated This property is deprecated. Access .resultPath on the method response instead.
   */
  getResponseMapping(): string | undefined;
  response: SdkMethodResponse;
  exception?: SdkMethodResponse;
  generateConvenient: boolean;
  generateProtocol: boolean;
}

export interface SdkBasicServiceMethod<TServiceOperation extends SdkServiceOperation>
  extends SdkServiceMethodBase<TServiceOperation> {
  kind: "basic";
}

interface SdkPagingServiceMethodOptions {
  __raw_paged_metadata: PagedResultMetadata;
  nextLinkPath?: string; // off means fake paging
  nextLinkOperation?: SdkServiceOperation;
}

export interface SdkPagingServiceMethod<TServiceOperation extends SdkServiceOperation>
  extends SdkServiceMethodBase<TServiceOperation>,
    SdkPagingServiceMethodOptions {
  kind: "paging";
}

interface SdkLroServiceMethodOptions {
  __raw_lro_metadata: LroMetadata;
}

export interface SdkLroServiceMethod<TServiceOperation extends SdkServiceOperation>
  extends SdkServiceMethodBase<TServiceOperation>,
    SdkLroServiceMethodOptions {
  kind: "lro";
}

export interface SdkLroPagingServiceMethod<TServiceOperation extends SdkServiceOperation>
  extends SdkServiceMethodBase<TServiceOperation>,
    SdkLroServiceMethodOptions,
    SdkPagingServiceMethodOptions {
  kind: "lropaging";
}

export type SdkServiceMethod<TServiceOperation extends SdkServiceOperation> =
  | SdkBasicServiceMethod<TServiceOperation>
  | SdkPagingServiceMethod<TServiceOperation>
  | SdkLroServiceMethod<TServiceOperation>
  | SdkLroPagingServiceMethod<TServiceOperation>;

export interface SdkClientAccessor<TServiceOperation extends SdkServiceOperation>
  extends SdkMethodBase {
  kind: "clientaccessor";
  response: SdkClientType<TServiceOperation>;
}

export type SdkMethod<TServiceOperation extends SdkServiceOperation> =
  | SdkServiceMethod<TServiceOperation>
  | SdkClientAccessor<TServiceOperation>;

export interface SdkPackage<TServiceOperation extends SdkServiceOperation> {
  name: string;
  rootNamespace: string;
  clients: SdkClientType<TServiceOperation>[];
  models: SdkModelType[];
  enums: SdkEnumType[];
  crossLanguagePackageId: string;
}

export type SdkHttpPackage = SdkPackage<SdkHttpOperation>;

export type LanguageScopes = "dotnet" | "java" | "python" | "javascript" | "go" | string;

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
  // Output will also be set when Error is set.
  Error = 1 << 7,
  // Set when model is used in conjunction with an application/json content type.
  Json = 1 << 8,
  // Set when model is used in conjunction with an application/xml content type.
  Xml = 1 << 9,
  // Set when a model is used as a property of another model.
  Property = 1 << 10,
}

interface SdkExampleBase {
  kind: string;
  name: string;
  description: string;
  filePath: string;
  rawExample: any;
}

export interface SdkHttpOperationExample extends SdkExampleBase {
  kind: "http";
  parameters: SdkHttpParameterExample[];
  responses: Map<number, SdkHttpResponseExample>;
}

export interface SdkHttpParameterExample {
  parameter: SdkHttpParameter;
  value: SdkTypeExample;
}

export interface SdkHttpResponseExample {
  response: SdkHttpResponse;
  headers: SdkHttpResponseHeaderExample[];
  bodyValue?: SdkTypeExample;
}

export interface SdkHttpResponseHeaderExample {
  header: SdkServiceResponseHeader;
  value: SdkTypeExample;
}

export type SdkTypeExample =
  | SdkStringExample
  | SdkNumberExample
  | SdkBooleanExample
  | SdkNullExample
  | SdkAnyExample
  | SdkArrayExample
  | SdkDictionaryExample
  | SdkUnionExample
  | SdkModelExample;

export interface SdkExampleTypeBase {
  kind: string;
  type: SdkType;
  value: unknown;
}

export interface SdkStringExample extends SdkExampleTypeBase {
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

export interface SdkNumberExample extends SdkExampleTypeBase {
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

export interface SdkBooleanExample extends SdkExampleTypeBase {
  kind: "boolean";
  type: SdkBuiltInType | SdkConstantType;
  value: boolean;
}

export interface SdkNullExample extends SdkExampleTypeBase {
  kind: "null";
  type: SdkNullableType;
  value: null;
}

export interface SdkAnyExample extends SdkExampleTypeBase {
  kind: "any";
  type: SdkBuiltInType;
  value: unknown;
}

export interface SdkArrayExample extends SdkExampleTypeBase {
  kind: "array";
  type: SdkArrayType;
  value: SdkTypeExample[];
}

export interface SdkDictionaryExample extends SdkExampleTypeBase {
  kind: "dict";
  type: SdkDictionaryType;
  value: Record<string, SdkTypeExample>;
}

export interface SdkUnionExample extends SdkExampleTypeBase {
  kind: "union";
  type: SdkUnionType;
  value: unknown;
}

export interface SdkModelExample extends SdkExampleTypeBase {
  kind: "model";
  type: SdkModelType;
  value: Record<string, SdkTypeExample>;
  additionalPropertiesValue?: Record<string, SdkTypeExample>;
}
