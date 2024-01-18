import { LroMetadata, PagedResultMetadata } from "@azure-tools/typespec-azure-core";
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
  Union,
  UsageFlags,
} from "@typespec/compiler";
import {
  HttpAuth,
  HttpOperation,
  HttpOperationResponse,
  HttpVerb,
  Visibility,
} from "@typespec/http";

export interface SdkContext<
  TServiceOperation extends SdkServiceOperation = SdkHttpOperation,
  TOptions extends object = Record<string, any>,
> {
  program: Program;
  sdkPackage: SdkPackage<TServiceOperation>;
  emitContext: EmitContext<TOptions>;
  emitterName: string;
  generateProtocolMethods: boolean;
  generateConvenienceMethods: boolean;
  filterOutCoreModels?: boolean;
  packageName?: string;
  modelsMap?: Map<Type, SdkModelType | SdkEnumType>;
  unionsMap?: Map<Union, SdkUnionType>;
  operationModelsMap?: Map<Operation, Map<Type, SdkModelType | SdkEnumType>>;
  __api_version_parameter?: SdkParameter;
  __api_version_client_default_value?: string;
  __api_versions?: string[];
  __clients?: Map<SdkClient | SdkOperationGroup, SdkClientType<TServiceOperation>>;
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
  endpoint: string;
  hasParameterizedEndpoint: boolean;
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
  | SdkCredentialType;

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
  | "etag"; // If you add you'll need to update isSdkBuiltInKind in utils as well

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
  access?: AccessFlags;
  crossLanguageDefinitionId: string;
  apiVersions: string[];
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
  generatedName?: string;
  description?: string;
  details?: string;
  access?: AccessFlags;
  usage: UsageFlags;
  additionalProperties?: SdkType;
  discriminatorValue?: string;
  discriminatedSubtypes?: Record<string, SdkModelType>;
  baseModel?: SdkModelType;
  crossLanguageDefinitionId: string;
  apiVersions: string[];
}

export interface SdkCredentialType extends SdkTypeBase {
  kind: "credential";
  scheme: HttpAuth;
}

export interface SdkModelPropertyTypeBase {
  __raw?: ModelProperty;
  type: SdkType;
  nameInClient: string;
  description?: string;
  details?: string;
  apiVersions: string[];
  onClient: boolean;
  clientDefaultValue?: any;
  isApiVersionParam: boolean;
  optional: boolean;
}

export interface SdkEndpointParameter extends SdkModelPropertyTypeBase {
  kind: "endpoint";
  urlEncode: boolean;
  onClient: true;
  serializedName?: string;
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
  visibility?: Visibility[];
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
}

export interface SdkMethodResponse {
  kind: "method";
  type?: SdkType;
  responsePath?: string; // how to map service response -> method response (e.g. paging). If undefined, it's a 1:1 mapping
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
  responses: Record<number | string, SdkHttpResponse>; // we will use string to represent status code range
  exceptions: Record<number | string, SdkHttpResponse>; // we will use string to represent status code range
}

/**
 * We eventually will include other kinds of service operations, i.e. grpc. For now, it's just Http.
 */

export type SdkServiceOperation = SdkHttpOperation;
export type SdkServiceParameter = SdkHttpParameter;

/**
 * Flattened model body
 * def foo(bar: string, baz: string) -> string which sends body {"bar": string, "baz": string}
 *
 * Method
 * params: ["bar", "baz"]
 * getParameterMapping(body) === [bar, baz]
 * response: string
 * getResponseMapping(ServiceMethodResponse<string>) ===
 * // No response mapping if the same
 *
 * Service Operation
 * bodyParams: ["body"]
 * response: string
 *
 * Grouped model body
 * def foo(options: {"path": string, "query": string})
 *
 * Method
 * params: ["options"]
 * getParameterMapping(path) === [options.path]
 * getParameterMapping(query) === [options.query]
 *
 * Service Operation
 * params: ["path", "query"]
 *
 * Paging
 * def foo() -> ItemPaged[Item]
 *
 * Method
 * response: ItemPaged[Item]
 * getResponseMapping(response) === [response.nextLink]
 * responseMapping: {"$": "result.values"}
 *
 * Service Operation
 * response: {"nextValue": string, "values": Item[]}
 *
 * Grouping of header and body
 * def foo() -> {"header": string, "body": string}
 * response: {"header": string, "body": string}
 * responseMapping: {"result.header": "header", "result.body": "body"}
 *
 * Service Operation
 * response: {"body": string}
 * responseHeaders: ["header"]
 */

interface SdkMethodBase<TServiceOperation extends SdkServiceOperation> {
  __raw?: Operation;
  name: string;
  access: AccessFlags | undefined;
  parameters: SdkParameter[];
  apiVersions: string[];
  description?: string;
  details?: string;
  overloads?: SdkMethod<TServiceOperation>[];
  overloading?: SdkMethod<TServiceOperation>;
}

/**
 * ResponseMapping
 *
 * Normal operation
 *
 * def foo() -> string
 * ServiceResponse: {type: string, headers: [{"x-ms-client-request-id": string}]}
 * MethodResponse: {type: string}
 * getResponseMapping: {resultPath: "", resultType: string}
 * return serviceResponse.body
 *
 * Paging operation
 * def list_foo() -> ItemPaged[Item]
 * ServiceResponse: {type: {"nextLink": string, "values": Item[]}]}
 * MethodResponse: Item[]
 * getResponseMapping: {resultPath: ".values", resultType: Item[]}
 * return serviceResponse.body.values
 *
 * LRO operation
 * def create_foo() -> Foo
 * ServiceResponse: {type: OperationStatus<Foo>, headers: [{"location": string}]}
 * MethodResponse:
 * getResponseMapping: {"$": ".result"}
 * return serviceResponse.body.result
 *
 * Return object of headers and body
 * def headers_and_body() -> HeaderAndBodyModel
 * ServiceResponse: {type: string, headers: [{"x-ms-client-request-id": string}]}
 * MethodResponse: {type: HeaderAndBodyModel}
 * return HeaderAndBodyModel(body=serviceResponse.body, client_request_id=serviceResponse.headers["x-ms-client-request-id"])
 * getResponseMapping: {"$.body": ".body", "$.client_request_id": ".headers["x-ms-client-request-id"]}
 */

interface SdkServiceMethodBase<TServiceOperation extends SdkServiceOperation>
  extends SdkMethodBase<TServiceOperation> {
  getParameterMapping(serviceParam: SdkServiceParameter): SdkModelPropertyType[];
  operation: TServiceOperation;
  parameters: SdkMethodParameter[];
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

interface SdkClientAccessor<TServiceOperation extends SdkServiceOperation>
  extends SdkMethodBase<TServiceOperation> {
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
}

export type SdkHttpPackage = SdkPackage<SdkHttpOperation>;
