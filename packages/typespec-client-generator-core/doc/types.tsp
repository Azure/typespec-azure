import "@typespec/http";
using TypeSpec.Reflection;
using TypeSpec.Http;

namespace TypeSpec.ClientGenerator.Core;

/**
 * Base SdkType that all types polymorphically extend from.
 *
 * @property __raw: the original TypeSpec type
 * @property kind: the kind of type
 * @property nullable: Whether the type is nullable on the wire
 * @property deprecation: deprecated message if the type is deprecated
 */
@discriminator("kind")
model SdkType {
  __raw?: unknown;
  nullable: boolean;
  deprecation?: string;
}

/**
 * Flags enum to keep track of usages for models and enums.
 *
 * @enum input: If the object is used as input
 * @enum output: If the object is used as output
 */
enum UsageFlags {
  input: 1,
  output: 2,
}

/**
 * Access flags to keep track of access levels for operations and models
 *
 * @enum public: Whether the object is a publicly-accessible object
 * @enum internal: Whether the object is an internal object
 */
enum AccessFlags {
  public,
  internal,
}

/**
 * Flags enum to keep track of visibility
 *
 * @enum read: Whether the object is read
 */
enum Visibility {
  read: 1,
}

/**
 * These types are more primitive and roughly correspond to the TypeSpec built in types
 *
 * @property encode: How we represent the type to SDK users
 */
model SdkBuiltInType extends SdkType {
  kind:
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
    | "eTag";
  encode: string;
}

/**
 * Represents a datetime type.
 *
 * @property encode: How to encode the datetime and represent to users
 * @property wireType: What type we end up sending over the wire for a datetime. Can be a string or an int type.
 */
model SdkDatetimeType extends SdkType {
  kind: "datetime";
  encode: DateTimeKnownEncoding;
  wireType: SdkType;
}

/**
 * Represents a duration type
 *
 * @property encode: How to encode the duration type and represent it to users.
 * @property wireType: What type we end up sending over the wire for a duration. Can be a string, an int, or a float type.
 */
model SdkDurationType extends SdkType {
  kind: "duration";
  encode: DurationKnownEncoding;
  wireType: SdkType;
}

/**
 * An array type
 *
 * @property valueType: The type of each value in the array
 */
model SdkArrayType extends SdkType {
  kind: "array";
  valueType: SdkType;
}

/**
 * An tuple type
 *
 * @property values: The values in the tuple
 */
model SdkTupleType extends SdkType {
  kind: "tuple";
  values: SdkType[];
}

/**
 * A dictionary type
 *
 * @property keyType: The type of the key. 99.9% of the time it's a string, but OpenAI does have it as an int.
 * @property valueType: The type of the values
 */
model SdkDictionaryType extends SdkType {
  kind: "dict";
  keyType: SdkType;
  valueType: SdkType;
}

/**
 * Represents an enum type
 *
 * @property name: Name of the enum
 * @property valueType: The type of the enum values
 * @property values: List of enum values
 * @property isFixed: Whether it's a fixed value enum
 * @property description: Description of the enum
 * @property details: Optional details of the enum object
 * @property isFlags: Whether the enum represents a set of flags
 * @property access: Access level of the enum
 * @property usage: Usage cases for the enum. Used to filter when people only want input or output enums
 * @property summary: Summary of an enum
 * @property isUnionAsEnum: Whether the enum is converted from TypeSpec union type
 */
model SdkEnumType extends SdkType {
  kind: "enum";
  name: string;
  valueType: SdkBuiltInType;
  values: SdkEnumValueType[];
  isFixed: boolean;
  description?: string;
  details?: string;
  isFlags: boolean;
  access: AccessFlags;
  usage: UsageFlags;
  summary: string;
  nameSpace: string;
  isUnionAsEnum: boolean;
}

/**
 * Represents an enum value type
 *
 * @property name: The name of the enum value
 * @property value: The value of the enum
 * @property enumType: The enum that this value belongs to
 * @property valueType: Type of the value. Same as the type listed in SdkEnumType.valueType
 * @property description: Description for the enum value
 * @property details: Optional details on the enum value
 */
model SdkEnumValueType extends SdkType {
  kind: "enumvalue";
  name: string;
  value: string | numeric;
  enumType: SdkEnumType;
  valueType: SdkType;
  description?: string;
  details?: string;
}

/**
 * Represents a constant type
 *
 * @property value: The value of the constant
 * @property valueType: The type of the constant value
 */
model SdkConstantType extends SdkType {
  kind: "constant";
  value: string | numeric | boolean | null;
  valueType: SdkBuiltInType;
}

/**
 * Represents a union type
 *
 * @property name: The name of the union type if it's a named union type, otherwise undefined
 * @property values: The various values that are unioned
 */
@doc("Represents a union type")
model SdkUnionType extends SdkType {
  kind: "union";
  name?: string;
  values: SdkType[];
}

/**
 * Represents a model type
 *
 * @property name: Name of the model
 * @property description: Description of the model
 * @property details: Optional details of the model
 * @property properties: List of properties on the model
 * @property access: Access level of the model
 * @property usage: Usage cases for the model. Used to filter when people only want input or output models.
 * @property additionalProperties: Model's additional properties type, if no additional properties, then undefined
 * @property discriminatorValue: Value of the discriminator if this is a discriminated subtype. Will be undefined if not.
 * @property discriminatedSubtypes: Mapping of discriminator value to this models discriminated subtypes if there are any.
 * @property discriminatorProperty: The property that is the discriminator for this model if it's a discriminated subtype. Will be undefined if not.
 * @property baseModel: The base model class of this model type if one exists.
 */
model SdkModelType extends SdkType {
  kind: "model";
  name: string;
  description?: string;
  details?: string;
  summary: string;
  properties: SdkModelPropertyType[];
  access: AccessFlags;
  usage: UsageFlags;
  additionalProperties?: SdkType;
  discriminatorValue?: string;
  discriminatedSubtypes?: Record<SdkModelType>;
  discriminatorProperty?: SdkModelPropertyType;
  baseModel?: SdkModelType;
  nameSpace: string;
}

/**
 * Base class for our property types
 *
 * @property kind: The kind of property
 * @property __raw: The original TSP property
 * @property type: The type of the property
 * @property name: The name of the property in our client SDKs
 * @property description: Description for the property
 * @property details: Optional details of the property
 * @property apiVersions: Api versions the property is available for
 * @property onClient: Whether the property is on the client
 * @property optional: Whether its an optional property
 */
@doc("Base class for our property types")
@discriminator("kind")
model SdkModelPropertyType {
  __raw?: ModelProperty;
  type: SdkType;
  name: string;
  description?: string;
  details?: string;
  apiVersions: string[];
  onClient: boolean;
  optional: boolean;
}

/**
 * If one to one between method parameter and sdk service parameter:
 * MethodParameter: {
 *   name: "pathParam",
 *   type: "string",
 *   kind: "method"
 * }
 * SdkServiceParameter: {
 *   name: "pathParam",
 *   type: "string",
 *   kind: "path"
 * }
 * mapping: {
 *   "": SdkServiceParameter
 * }
 *
 * If one to many between method parameter and sdk service parameter
 * MethodParameter: {
 *   name: "input",
 *   type: {
 *     kind: "model",
 *     properties: [
 *       {
 *         name: "path_param",
 *         serializedName: "pathParam"
 *         type: "string",
 *         kind: "path"
 *       },
 *       {
 *         name: "query_param",
 *         name: "queryParam",
 *         type: "string",
 *         kind: "query"
 *       }
 *     ]
 *   },
 *   kind: "method"
 * }
 * PathServiceParameter: {
 *   name: "pathParam",
 *   serializedName: "pathParam",
 *   type: "string",
 *   kind: "path",
 *   mapping : {
 *     logicalPath: "path_param",
 *     type: "string",
 *   }
 * }
 * QueryServiceParameter: {
 *   name: "queryParam",
 *   serializedName: "queryParam",
 *   type: "string",
 *   kind: "query",
 *   mapping: {
 *     logicalPath: "query_param",
 *     type: "string"
 *   }
 * }
 */
/**
 * Represents a mapping from the method to the service or from the service to the method
 */
model SdkMethodServiceMapping {
  logicalPath: string;
  property: SdkModelPropertyType;
}

/**
 * Represents a method parameter
 */
model SdkMethodParameter extends SdkModelPropertyType {
  kind: "method";
}

/**
 * Represents a property for a body model type
 *
 * @property visibility: Visibility of the model
 * @property discriminator: Whether the property is a discriminator
 * @property serializedName: The name of the property we send over the wire to the services
 */
model SdkBodyModelPropertyType extends SdkModelPropertyType {
  kind: "property";
  discriminator: boolean;
  serializedName: string;
  visibility?: Visibility;
}

/**
 * Represents a header parameter
 *
 * @property serializedName: The name of the property we send over the wire to the services
 * @property collectionFormat: The format for a collection of headers
 */
model SdkHeaderServiceParameter extends SdkModelPropertyType {
  kind: "header";
  serializedName: string;
  collectionFormat?: "multi" | "csv" | "ssv" | "tsv" | "pipes";
  mapping: SdkMethodServiceMapping;
}

/**
 * Represents a query parameter.
 *
 * @property serializedName: The name of the property we send over the wire to the services
 * @property collectionFormat: The format for a collection of queries
 */
model SdkQueryServiceParameter extends SdkModelPropertyType {
  kind: "query";
  serializedName: string;
  collectionFormat?: "multi" | "csv" | "ssv" | "tsv" | "pipes";
  mapping: SdkMethodServiceMapping;
}

/**
 * Represents a path parameter
 *
 * @property serializedName: The name of the property we send over the wire to the services
 * @property urlEncode: Whether to url encode the path parameter
 * @property validation: Any validation for the path parameter. Right now only including validation on path paramters because we only know about path params needing validation.
 * @property location: Whether the parameter is a client-level or operation-level parameter
 */
model SdkPathServiceParameter extends SdkModelPropertyType {
  kind: "path";
  serializedName: string;
  urlEncode: boolean;
  validation?: SdkValidation;
  mapping: SdkMethodServiceMapping;
  optional: false;
}

/**
 * Represents an Oauth2Auth flow. Copied from typespec/http because it doesn't export
 *
 * @property id: id of the authentication scheme
 * @property description: Optional description
 * @property flows: Flows for the authentication
 */
model Oauth2Auth<TFlows extends OAuth2Flow[]> {
  type: "oauth2";
  id: string;
  description?: string;
  flows: TFlows;
}

/**
 * Credential type for a client
 *
 * @property scheme: Potential schemes for the credential
 */
model SdkCredentialType extends SdkType {
  kind: "credential";
  scheme: BasicAuth | BearerAuth | ApiKeyAuth<ApiKeyLocation, string> | Oauth2Auth<OAuth2Flow[]>;
}

/**
 * Represents a credential parameter
 *
 * @property type: The type of the credential. Can be either a single SdkCredentialType or a union of SdkCredentialTypes
 */
model SdkCredentialParameter extends SdkModelPropertyType {
  kind: "credential";
  type: SdkCredentialType | SdkUnionType;
  urlEncode: boolean;
}

/**
 * Represents the client endpoint parameter
 */
model SdkEndpointParameter extends SdkModelPropertyType {
  kind: "endpoint";
  type: SdkType; // should be string
  urlEncode: boolean;
  serializedName?: string;
}

/**
 * Represents a body parameter to the service.
 *
 * @property contentTypes: The content types the body parameter is valid for
 * @property defaultContentType: What content type to send by default if none are specified
 * @property mapping: Mapping from the body parameter to the method parameter
 */
model SdkBodyServiceParameter extends SdkModelPropertyType {
  kind: "body";
  contentTypes: string[];
  defaultContentType: string;
  mapping: SdkMethodServiceMapping;
}

/**
 * Model representing all parameters on an operation
 *
 * @property __raw: The original TSP type
 * @property parameters: List of query / header / path parameters
 * @property body: The body parameter, if one exists
 */
model SdkOperationParameters {
  __raw?: unknown;
  parameters: (SdkQueryParameter | SdkHeaderParameter | SdkPathParameter)[];
  body?: SdkBodyParameter;
}

/**
 * Representing a response header
 *
 * @property __raw: The original TSP response header
 * @property serializedName: The serialized name of the response header
 * @property type: Type of the response header
 */
model SdkResponseHeader {
  __raw?: ModelProperty;
  serializedName: string;
  type: SdkType;
}

/**
 * Representing a possible response of an operation
 *
 * @property __raw: The original TSP response
 * @property type: The type of the response
 */
@discriminator("kind")
model SdkResponse {
  __raw: unknown;
  type: SdkType;
}

/**
 * Represents a response from a service operation
 *
 * @property headers: Headers returned as part of the response
 */
model SdkServiceOperationResponse extends SdkResponse {
  kind: "operation";
  headers: SdkResponseHeader[];
}

/**
 * Response from a method that calls a service operation
 *
 * @property mapping: Mapping from the responses of the service operation to the response the method returns
 */
model SdkServiceMethodResponse extends SdkResponse {
  kind: "method";
  mapping: SdkMethodServiceMapping;
}

/**
 * Service parameter
 */
alias SdkServiceParameter = SdkQueryServiceParameter | SdkHeaderServiceParameter | SdkPathServiceParameter;

/**
 * Base class for representation of a client method.
 *
 * @property name: The name of the method
 * @property access: The access level of the method
 * @property parameters: Parameters object for the method
 * @property description: Description of the operation
 * @property details: Optional details of the operation
 */
@discriminator("kind")
model SdkMethod {
  name: string; // return myFunc for Python and Java, but include projectedNames
  access: AccessFlags;
  parameters: SdkMethodParameter[];
  description?: string;
  details?: string;
}

/**
 * Returns an sdk client from a top level client
 *
 * @property response: which client the operation returns
 */
model SdkClientAccessor extends SdkMethod {
  kind: "client";
  response: SdkClientType;
}

/**
 * Represents a method that includes a service call
 *
 * @property operation: The operation that calls the service
 * @property response: The model the method returns
 * @property exceptions: Exceptions of the method
 */
model SdkServiceMethod extends SdkMethod {
  kind: "methodforserviceoperation";
  operation: SdkServiceOperation;
  response: SdkServiceMethodResponse;
  exceptions: SdkServiceMethodResponse[];
}

/**
 * Represents an operation to the service. Is HTTP specific.
 *
 * @property __raw: The original TSP HTTP operation
 * @property path: Path of the operation
 * @property verb: Http verb
 * @property parameters: HTTP parameters for the service operation. These parameters will contain a mapping from the method to themselves
 * @property responses: Non-error responses of the operation
 * @property exceptions: Exceptions of the operation
 */
@discriminator("kind")
model SdkServiceOperation {
  __raw: unknown;
  path: string;
  verb: string;
  parameters: SdkServiceParameter[];
  bodyParameter?: SdkBodyServiceParameter;
  responses: Record<SdkServiceOperationResponse>; // int status code -> SdkServiceOperationResponse
  exception: SdkServiceOperationResponse;
}

/**
 * Representation of a basic operation
 *
 * @property kind: Discriminator for the type of operation
 */
model SdkBasicServiceOperation extends SdkServiceOperation {
  kind: "basic";
}

/**
 * Sdk paging operation options
 *
 * @property __raw_paged_metadata: The original TSP paging metadata
 * @property itemsMapping: Mapping of the items to return in the iterable
 * @property nextLinkPath: Where to get the next link. Off if we know there won't be a second page
 * @property nextLinkOperation: The operation to call to get the next page, if there is one
 */
alias SdkPagingServiceOperationOptions = {
  __raw_paged_metadata: unknown;
  itemsMapping: SdkMethodServiceMapping;
  nextLinkPath?: string;
  nextLinkOperation?: SdkServiceOperation;
};

/**
 * Representation of a paging operation
 */
model SdkPagingServiceOperation extends SdkServiceOperation {
  kind: "paging";
  ...SdkPagingServiceOperationOptions;
}

/**
 * Sdk LRO operation options
 *
 * @property __raw_lro_metadata: The original TSP LRO metadata
 */
alias SdkLroServiceOperationOptions = {
  __raw_lro_metadata: unknown;
};

/**
 * Representation of a lro operation
 */
model SdkLroServiceOperation extends SdkServiceOperation {
  kind: "lro";
  ...SdkLroServiceOperationOptions;
}

/**
 * Representation of a lro paging operation
 */
model SdkLroPagingServiceOperation extends SdkServiceOperation {
  kind: "lropaging";
  ...SdkPagingServiceOperationOptions;
  ...SdkLroServiceOperationOptions;
}

/**
 * Base class for validation on types
 *
 * @property kind: Kind for validation
 */
@discriminator("kind")
model SdkValidation {}

/**
 * Validations for a string type
 *
 * @property pattern: Any validation on the pattern of the string
 * @property minLength: Validation on the min length of the string
 * @property maxLength: Validation on the max length of the string
 */
model SdkStringValidation extends SdkValidation {
  kind: "string";
  pattern?: string;
  minLength?: int32;
  maxLength?: int32;
}

/**
 * Validations for a numeric type
 *
 * @template Kind Kind of the numeric type
 * @template Type SdkType of the min / max value
 * @property minValue: Validation on the min value of the number
 * @property maxValue: Validation on the max value of the number
 */
model SdkNumericValidationTemplate<Kind, Type> extends SdkValidation {
  kind: Kind;
  minValue?: Type;
  maxValue?: Type;
}

/**
 * Validation for an int32 type
 */
model SdkInt32Validation is SdkNumericValidationTemplate<"int32", int32>;

/**
 * Validation for an int64 type
 */
model SdkInt64Validation is SdkNumericValidationTemplate<"int64", int64>;

/**
 * Validation for an float32 type
 */
model SdkFloat32Validation is SdkNumericValidationTemplate<"float32", float32>;

/**
 * Validation for an float64 type
 */
model SdkFloat64Validation is SdkNumericValidationTemplate<"float64", float64>;

/**
 * Representation of an SdkClient
 *
 * @property name: name of the client
 * @property description: documentation of the client
 * @property details: details of the client
 * @property initialization: initialization options for the client. Will include endpoint and credential options. Name defaults to {SdkClient.name}Options
 * @property methods: list of methods on the client. Can also be methods that return other clients.
 * @property apiVersions: List of api versions the client is available for
 * @property nameSpace: fully qualified namespace of the client
 * @property arm: is the client an arm client
 */
model SdkClientType {
  kind: "client";
  name: string;
  description?: string;
  details?: string;
  initialization: SdkModelType;
  methods: SdkMethod[];

  // TODO: we have groups of clients (for example, network client is a grouping of resource clients).
  // these do not have api versions. Should we do separate models for these? Or keep api versions as optional?
  apiVersions: string[]; // look into the sorting of this, if versioning package already does order it

  nameSpace: string;
  arm: boolean;
}

/**
 * Represents and entire SDK package
 *
 * @property name: Name of the package
 * @property rootNamespace: Root namespace of the package
 * @property clients: List of clients in the package
 * @property models: List of models in the package
 * @property enums: List of enums in the package
 */
model SdkPackage {
  name: string;
  rootNamespace: string; // TODO: how do we want to define this for languages in client.tsp. few samples for each language to fill in
  clients: SdkClientType[];
  models: SdkModelType[]; // 2 options: Have it as a function that takes in filter, or add filter as a context parameter
  enums: SdkEnumType[];
}

/**
 * Context that is passed around for an emitter's instance in TCGC.
 *
 * @property program: The TypeSpec program, a Program type.
 * @property emitContext: The emit context of the tsp emitter. Pass the full library name of your emitter
 * @property generateProtocolMethods: Whether to generate protocol methods by default
 * @property generateConvenienceMethods: Whether to generate convenience methods by default
 * @property filterOutCoreModels: Whether to filter out core models in returned models. Defaults to true.
 * @property packageName: The name of the package
 * @property emitterName: The name of the emitter. If not passed, we will find the value ourselves.
 * @property modelsMap: Type map we create to keep track of all models
 * @property operationModelsMap: Type map we create to keep track of mapping between operations and the models they use. Used for transitive closure on access.
 */
model SdkContext {
  program: unknown;
  emitContext: unknown;
  generateProtocolMethods: boolean;
  generateConvenienceMethods: boolean;
  filterOutCoreModels: boolean = true;
  packageName?: string;
  emitterName?: string;
  modelsMap?: Record<Model>;
  operationModelsMap?: Record<Model>;
  returnEntireLroResult: boolean;
}

/**
 * getAllModelsRequestOptions
 *
 * @property input: boolean determining whether to return input models. Default is true
 * @property output: boolean determining whether to return output models. Default is true
 */
alias GetAllModelsRequestOptions = {
  input: boolean = true;
  output: boolean = true;
};

/**
 * Return all of the types we want to generate filtered by usage flags if filter is specified.
 *
 * @param context: the sdk context
 * @returns List of models and enums to generate as types
 */
op getAllModels(
  @doc("Sdk context")
  context: SdkContext,

  ...GetAllModelsRequestOptions,
): (SdkModelType | SdkEnumType)[];
