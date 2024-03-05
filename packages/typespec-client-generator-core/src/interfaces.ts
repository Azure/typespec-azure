import {
  DateTimeKnownEncoding,
  DurationKnownEncoding,
  EmitContext,
  Interface,
  ModelProperty,
  Namespace,
  Type,
  UsageFlags,
} from "@typespec/compiler";
import {
  HttpOperation,
  HttpOperationParameters,
  HttpOperationResponse,
  HttpStatusCodes,
  HttpVerb,
  Visibility,
} from "@typespec/http";
import { TCGCContext } from "./internal-utils.js";

export type SdkParameterLocation =
  | "endpointPath"
  | "header"
  | "query"
  | "path"
  | "body"
  | "unknown";
export type SdkParameterImplementation = "Client" | "Method";

export interface SdkContext<TOptions extends object = Record<string, any>> extends TCGCContext {
  emitContext: EmitContext<TOptions>;
}

export interface SdkEmitterOptions {
  "generate-protocol-methods"?: boolean;
  "generate-convenience-methods"?: boolean;
  "filter-out-core-models"?: boolean;
  "package-name"?: string;
}

export interface SdkClient {
  kind: "SdkClient";
  name: string;
  service: Namespace;
  type: Namespace | Interface;
  arm: boolean;
  crossLanguageDefinitionId: string;
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
  | SdkModelType;

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

export interface SdkEnumType extends SdkTypeBase {
  kind: "enum";
  name: string;
  generatedName?: string;
  valueType: SdkBuiltInType;
  values: SdkEnumValueType[];
  isFixed: boolean;
  description?: string;
  details?: string;
  isFlags: boolean;
  usage: UsageFlags;
  access: AccessFlags | undefined;
  crossLanguageDefinitionId: string;
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
  name?: string;
  generatedName?: string;
  kind: "union";
  values: SdkType[];
}

export type AccessFlags = "internal" | "public";

export interface SdkModelType extends SdkTypeBase {
  kind: "model";
  properties: SdkModelPropertyType[];
  name: string;
  isFormDataType: boolean;
  isError: boolean;
  generatedName?: string;
  description?: string;
  details?: string;
  access: AccessFlags | undefined;
  usage: UsageFlags;
  additionalProperties: SdkType | undefined;
  discriminatorValue?: string;
  discriminatedSubtypes?: Record<string, SdkModelType>;
  baseModel?: SdkModelType;
  crossLanguageDefinitionId: string;
}

export interface SdkModelPropertyTypeBase {
  __raw?: ModelProperty;
  type: SdkType;
  nameInClient: string;
  description?: string;
  details?: string;
  apiVersions: string[];
  optional: boolean;
}

export type SdkModelPropertyType =
  | SdkBodyModelPropertyType
  | SdkHeaderParameter
  | SdkQueryParameter
  | SdkPathParameter
  | SdkBodyParameter;

export interface SdkBodyModelPropertyType extends SdkModelPropertyTypeBase {
  kind: "property";
  discriminator: boolean;
  serializedName: string;
  isMultipartFileInput: boolean;
  visibility?: Visibility[];
  flatten: boolean;
}

type CollectionFormat = "multi" | "csv" | "ssv" | "tsv" | "pipes";

interface SdkHeaderParameter extends SdkModelPropertyTypeBase {
  kind: "header";
  collectionFormat?: CollectionFormat;
  serializedName: string;
}

interface SdkQueryParameter extends SdkModelPropertyTypeBase {
  kind: "query";
  collectionFormat?: CollectionFormat;
  serializedName: string;
}

interface SdkPathParameter extends SdkModelPropertyTypeBase {
  kind: "path";
  urlEncode: boolean;
  validation: SdkValidation;
  serializedName: string;
  optional: false;
}

interface SdkBodyParameter extends SdkModelPropertyTypeBase {
  kind: "body";
  optional: boolean;
  contentTypes: string[];
  defaultContentType: string;
}

interface SdkOperationParameters {
  __raw?: HttpOperationParameters;
  parameters: (SdkQueryParameter | SdkHeaderParameter | SdkPathParameter)[];
  body?: SdkBodyParameter;
}

interface SdkResponseHeader {
  __raw?: ModelProperty;
  serializedName: string;
  type: SdkType;
}

interface SdkResponse {
  __raw?: HttpOperationResponse;
  statusCodes: HttpStatusCodes[];
  type: SdkType;
  doc: string;
  headers: SdkResponseHeader[];
}

interface SdkOperationBase<TOperation> {
  __raw?: HttpOperation;
  path: string;
  access: AccessFlags;
  verb: HttpVerb;
  parameters: SdkOperationParameters;
  responses: SdkResponse[];
  exceptions: SdkResponse[];
  overloads?: TOperation[];
  overloading?: TOperation;
}

interface SdkBasicOperation extends SdkOperationBase<SdkBasicOperation> {
  kind: "basic";
}

interface SdkPagingOperationOptions {
  itemsPath: string;
  itemType: SdkType;
  nextLinkPath: string;
}

interface SdkPagingOperation
  extends SdkOperationBase<SdkPagingOperation>,
    SdkPagingOperationOptions {
  kind: "paging";
}

interface SdkLroOperationOptions {
  initialOperation: SdkBasicOperation;
}

interface SdkLroOperation extends SdkOperationBase<SdkLroOperation>, SdkLroOperationOptions {
  kind: "lro";
}

interface SdkLroPagingOperation
  extends SdkOperationBase<SdkLroPagingOperation>,
    SdkPagingOperationOptions,
    SdkLroOperationOptions {
  kind: "lropaging";
}

export type SdkOperation =
  | SdkBasicOperation
  | SdkPagingOperation
  | SdkLroOperation
  | SdkLroPagingOperation;

export type SdkValidation =
  | SdkStringValidation
  | SdkInt32Validation
  | SdkInt64Validation
  | SdkFloat32Validation
  | SdkFloat64Validation;

interface SdkStringValidation {
  kind: "string";
  pattern?: string;
  minLength?: number;
  maxLength?: number;
}

interface SdkNumericValidationBase {
  minValue?: number;
  maxValue?: number;
}

interface SdkInt32Validation extends SdkNumericValidationBase {
  kind: "int32";
}

interface SdkInt64Validation extends SdkNumericValidationBase {
  kind: "int64";
}

interface SdkFloat32Validation extends SdkNumericValidationBase {
  kind: "float32";
}

interface SdkFloat64Validation extends SdkNumericValidationBase {
  kind: "float64";
}

export type LanguageScopes = "dotnet" | "java" | "python" | "javascript" | "go" | string;
