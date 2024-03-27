import { LroMetadata, PagedResultMetadata } from "@azure-tools/typespec-azure-core";
import {
  DateTimeKnownEncoding,
  Diagnostic,
  DurationKnownEncoding,
  EmitContext,
  Interface,
  ModelProperty,
  Namespace,
  Operation,
  Type,
} from "@typespec/compiler";
import {
  HttpAuth,
  HttpOperation,
  HttpOperationResponse,
  HttpStatusCodeRange,
  HttpVerb,
  Visibility,
} from "@typespec/http";
import { TCGCContext } from "./internal-utils.js";

export interface SdkContext<
  TOptions extends object = Record<string, any>,
  TServiceOperation extends SdkServiceOperation = SdkHttpOperation,
> extends TCGCContext {
  emitContext: EmitContext<TOptions>;
  experimental_sdkPackage: SdkPackage<TServiceOperation>;
  __clients?: SdkClientType<TServiceOperation>[];
}

export interface SdkEmitterOptions {
  "generate-protocol-methods"?: boolean;
  "generate-convenience-methods"?: boolean;
  "filter-out-core-models"?: boolean;
  "package-name"?: string;
  "flatten-union-as-enum"?: boolean;
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

export interface SdkClientType<TServiceOperation extends SdkServiceOperation> {
  kind: "client";
  name: string;
  description?: string;
  details?: string;
  initialization?: SdkInitializationType;
  methods: SdkMethod<TServiceOperation>[];
  apiVersions: string[];
  nameSpace: string; // fully qualified
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
}

interface SdkTypeBase {
  __raw?: Type;
  kind: string;
  /**
   * @deprecated Moving `.nullable` onto the parameter itself for fidelity.
   * https://github.com/Azure/typespec-azure/issues/448
   */
  nullable: boolean;
  deprecation?: string;
}

export type SdkType =
  | SdkBuiltInType
  | SdkDatetimeType
  | SdkDurationType
  | SdkArrayType
  | SdkTupleType
  | SdkDictionaryType
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
}

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

enum SdkFloatKindsEnum {
  float = "float",
  float32 = "float32",
  float64 = "float64",
  decimal = "decimal",
  decimal128 = "decimal128",
}

enum SdkAzureBuiltInStringKindsEnum {
  uuid = "uuid",
  ipV4Address = "ipV4Address",
  ipV6Address = "ipV6Address",
  eTag = "eTag",
  armId = "armId",
  azureLocation = "azureLocation",
}

enum SdkGenericBuiltInStringKindsEnum {
  string = "string",
  password = "password",
  guid = "guid",
  url = "url",
  uri = "uri",
  ipAddress = "ipAddress",
}

enum SdkBuiltInKindsMiscellaneousEnum {
  bytes = "bytes",
  boolean = "boolean",
  plainDate = "plainDate",
  plainTime = "plainTime",
  any = "any",
}

export type SdkBuiltInKinds =
  | keyof typeof SdkBuiltInKindsMiscellaneousEnum
  | keyof typeof SdkIntKindsEnum
  | keyof typeof SdkFloatKindsEnum
  | keyof typeof SdkGenericBuiltInStringKindsEnum
  | keyof typeof SdkAzureBuiltInStringKindsEnum;

export function getKnownScalars(): Record<string, SdkBuiltInKinds> {
  const retval: Record<string, SdkBuiltInKinds> = {};
  const typespecNamespace = Object.keys(SdkBuiltInKindsMiscellaneousEnum)
    .concat(Object.keys(SdkIntKindsEnum))
    .concat(Object.keys(SdkFloatKindsEnum))
    .concat(Object.keys(SdkGenericBuiltInStringKindsEnum));
  for (const kind of typespecNamespace) {
    if (!isSdkBuiltInKind(kind)) continue; // it will always be true
    retval[`TypeSpec.${kind}`] = kind;
  }
  for (const kind in SdkAzureBuiltInStringKindsEnum) {
    if (!isSdkBuiltInKind(kind)) continue; // it will always be true
    retval[`Azure.Core.${kind}`] = kind;
  }
  return retval;
}

export function isSdkBuiltInKind(kind: string): kind is SdkBuiltInKinds {
  return (
    kind in SdkBuiltInKindsMiscellaneousEnum ||
    kind in SdkIntKindsEnum ||
    kind in SdkFloatKindsEnum ||
    kind in SdkGenericBuiltInStringKindsEnum ||
    kind in SdkAzureBuiltInStringKindsEnum
  );
}

const SdkDatetimeEncodingsConst = ["rfc3339", "rfc7231", "unixTimestamp"] as const;

export function isSdkDatetimeEncodings(encoding: string): encoding is DateTimeKnownEncoding {
  return SdkDatetimeEncodingsConst.includes(encoding as DateTimeKnownEncoding);
}

interface SdkDatetimeTypeBase extends SdkTypeBase {
  encode: DateTimeKnownEncoding;
  wireType: SdkBuiltInType;
}

interface SdkUtcDatetimeType extends SdkDatetimeTypeBase {
  kind: "utcDateTime";
}

interface SdkOffsetDatetimeType extends SdkDatetimeTypeBase {
  kind: "offsetDateTime";
}

export type SdkDatetimeType = SdkUtcDatetimeType | SdkOffsetDatetimeType;

export interface SdkDurationType extends SdkTypeBase {
  kind: "duration";
  encode: DurationKnownEncoding;
  wireType: SdkBuiltInType;
}

export interface SdkArrayType extends SdkTypeBase {
  kind: "array";
  valueType: SdkType;
  nullableValues: boolean;
}

export interface SdkTupleType extends SdkTypeBase {
  kind: "tuple";
  values: SdkType[];
}

export interface SdkDictionaryType extends SdkTypeBase {
  kind: "dict";
  keyType: SdkType;
  valueType: SdkType;
  nullableValues: boolean;
}

export interface SdkEnumType extends SdkTypeBase {
  kind: "enum";
  name: string;
  generatedName: boolean;
  valueType: SdkBuiltInType;
  values: SdkEnumValueType[];
  isFixed: boolean;
  description?: string;
  details?: string;
  isFlags: boolean;
  usage: UsageFlags;
  access?: AccessFlags;
  crossLanguageDefinitionId: string;
  apiVersions: string[];
  isUnionAsEnum: boolean;
}

export interface SdkEnumValueType extends SdkTypeBase {
  kind: "enumvalue";
  name: string;
  value: string | number;
  enumType: SdkEnumType;
  valueType: SdkType;
  description?: string;
  details?: string;
}
export interface SdkConstantType extends SdkTypeBase {
  kind: "constant";
  value: string | number | boolean | null;
  valueType: SdkBuiltInType;
}

export interface SdkUnionType extends SdkTypeBase {
  name: string;
  generatedName: boolean;
  kind: "union";
  values: SdkType[];
}

export type AccessFlags = "internal" | "public";

export interface SdkModelType extends SdkTypeBase {
  kind: "model";
  properties: SdkModelPropertyType[];
  name: string;
  /**
   * @deprecated This property is deprecated. Check the bitwise and value of UsageFlags.MultipartFormData nad the `.usage` property on this model
   */
  isFormDataType: boolean;
  /**
   * @deprecated This property is deprecated. You should not need to check whether a model is an error model.
   */
  isError: boolean;
  generatedName: boolean;
  description?: string;
  details?: string;
  access?: AccessFlags;
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
  serverUrl?: string;
  templateArguments: SdkPathParameter[];
}

export interface SdkModelPropertyTypeBase {
  __raw?: ModelProperty;
  type: SdkType;
  /**
   * @deprecated This property is deprecated. Use `.name` instead.
   * https://github.com/Azure/typespec-azure/issues/446
   */
  nameInClient: string;
  name: string;
  description?: string;
  details?: string;
  apiVersions: string[];
  onClient: boolean;
  clientDefaultValue?: any;
  isApiVersionParam: boolean;
  optional: boolean;
  nullable: boolean;
}

export interface SdkEndpointParameter extends SdkModelPropertyTypeBase {
  kind: "endpoint";
  urlEncode: boolean;
  onClient: true;
  serializedName?: string;
  type: SdkEndpointType;
}

export interface SdkCredentialParameter extends SdkModelPropertyTypeBase {
  kind: "credential";
  type: SdkCredentialType | SdkUnionType; // union of credentials
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

export interface SdkBodyModelPropertyType extends SdkModelPropertyTypeBase {
  kind: "property";
  discriminator: boolean;
  serializedName: string;
  isMultipartFileInput: boolean;
  visibility?: Visibility[];
  flatten: boolean;
}

export type CollectionFormat = "multi" | "csv" | "ssv" | "tsv" | "pipes";

export interface SdkHeaderParameter extends SdkModelPropertyTypeBase {
  kind: "header";
  collectionFormat?: CollectionFormat;
  serializedName: string;
}

export interface SdkQueryParameter extends SdkModelPropertyTypeBase {
  kind: "query";
  collectionFormat?: CollectionFormat;
  serializedName: string;
}

export interface SdkPathParameter extends SdkModelPropertyTypeBase {
  kind: "path";
  urlEncode: boolean;
  serializedName: string;
  optional: false;
}

export interface SdkBodyParameter extends SdkModelPropertyTypeBase {
  kind: "body";
  optional: boolean;
  contentTypes: string[];
  defaultContentType: string;
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
  nullable: boolean;
}

export interface SdkMethodResponse {
  kind: "method";
  type?: SdkType;
  nullable: boolean;
}

export interface SdkServiceResponse {
  type?: SdkType;
  headers: SdkServiceResponseHeader[];
  apiVersions: string[];
  nullable: boolean;
}

export interface SdkHttpResponse extends SdkServiceResponse {
  __raw: HttpOperationResponse;
  kind: "http";
  contentTypes?: string[];
  defaultContentType?: string;
}

interface SdkServiceOperationBase {}

export type SdkParameter = SdkEndpointParameter | SdkCredentialParameter | SdkMethodParameter;

export interface SdkHttpOperation extends SdkServiceOperationBase {
  __raw: HttpOperation;
  kind: "http";
  path: string;
  verb: HttpVerb;
  parameters: (SdkPathParameter | SdkQueryParameter | SdkHeaderParameter)[];
  bodyParams: SdkBodyParameter[]; // array for cases like urlencoded / multipart
  responses: Map<HttpStatusCodeRange | number, SdkHttpResponse>;
  exceptions: Map<HttpStatusCodeRange | number | "*", SdkHttpResponse>;
}

/**
 * We eventually will include other kinds of service operations, i.e. grpc. For now, it's just Http.
 */

export type SdkServiceOperation = SdkHttpOperation;
export type SdkServiceParameter = SdkHttpParameter;

interface SdkMethodBase {
  __raw?: Operation;
  name: string;
  access: AccessFlags | undefined;
  parameters: SdkParameter[];
  apiVersions: string[];
  description?: string;
  details?: string;
}

interface SdkServiceMethodBase<TServiceOperation extends SdkServiceOperation>
  extends SdkMethodBase {
  getParameterMapping(serviceParam: SdkServiceParameter): SdkModelPropertyType[];
  operation: TServiceOperation;
  parameters: SdkMethodParameter[];
  getResponseMapping(): string | undefined; // how to map service response -> method response (e.g. paging). If undefined, it's a 1:1 mapping
  response: SdkMethodResponse;
  exception?: SdkMethodResponse;
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
  initialOperation: SdkServiceOperation;
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
  | SdkLroPagingServiceMethod<TServiceOperation>
  | SdkLroPagingServiceMethod<TServiceOperation>;

interface SdkClientAccessor<TServiceOperation extends SdkServiceOperation> extends SdkMethodBase {
  kind: "clientaccessor";
  response: SdkClientType<TServiceOperation>;
}

export type SdkMethod<TServiceOperation extends SdkServiceOperation> =
  | SdkServiceMethod<TServiceOperation>
  | SdkPagingServiceMethod<TServiceOperation>
  | SdkLroServiceMethod<TServiceOperation>
  | SdkLroPagingServiceMethod<TServiceOperation>
  | SdkClientAccessor<TServiceOperation>;

export interface SdkPackage<TServiceOperation extends SdkServiceOperation> {
  name: string;
  rootNamespace: string;
  clients: SdkClientType<TServiceOperation>[];
  models: SdkModelType[];
  enums: SdkEnumType[];
  diagnostics: readonly Diagnostic[];
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
  // Input will also be set when JsonMergePatch is set
  JsonMergePatch = 1 << 4,
  // Input will also be set when MultipartFormData is set
  MultipartFormData = 1 << 5,
}
