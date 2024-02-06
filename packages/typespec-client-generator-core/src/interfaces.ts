import {
  DateTimeKnownEncoding,
  DurationKnownEncoding,
  EmitContext,
  Interface,
  ModelProperty,
  Namespace,
  Operation,
  Program,
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

export type SdkParameterLocation =
  | "endpointPath"
  | "header"
  | "query"
  | "path"
  | "body"
  | "unknown";
export type SdkParameterImplementation = "Client" | "Method";

export interface SdkContext<TOptions extends object = Record<string, any>> {
  program: Program;
  emitContext: EmitContext<TOptions>;
  emitterName: string;
  generateProtocolMethods: boolean;
  generateConvenienceMethods: boolean;
  filterOutCoreModels?: boolean;
  packageName?: string;
  modelsMap?: Map<Type, SdkModelType | SdkEnumType>;
  operationModelsMap?: Map<Operation, Map<Type, SdkModelType | SdkEnumType>>;
  generatedNames?: Set<string>;
  arm?: boolean;
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

export type SdkBuiltInKinds =
  | "bytes"
  | "boolean"
  | "date"
  | "time"
  | "any"
  | "int32"
  | "int64"
  | "float32"
  | "float64"
  | "decimal"
  | "decimal128"
  | "string"
  | "guid"
  | "url"
  | "uuid"
  | "password"
  | "armId"
  | "ipAddress"
  | "azureLocation"
  | "etag";

const SdkDatetimeEncodingsConst = ["rfc3339", "rfc7231", "unixTimestamp"] as const;

export function isSdkDatetimeEncodings(encoding: string): encoding is DateTimeKnownEncoding {
  return SdkDatetimeEncodingsConst.includes(encoding as DateTimeKnownEncoding);
}

export interface SdkDatetimeType extends SdkTypeBase {
  kind: "datetime";
  encode: DateTimeKnownEncoding;
  wireType: SdkBuiltInType;
}

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
