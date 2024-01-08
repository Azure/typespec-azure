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
    | "etag";
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
  dicriminatorValue?: string;
  discriminatedSubtypes?: Record<SdkModelType>;
  baseModel?: SdkModelType;
}

/**
 * Base class for our property types
 *
 * @property kind: The kind of property
 * @property __raw: The original TSP property
 * @property type: The type of the property
 * @property nameInClient: The name of the property in our client SDKs
 * @property description: Description for the property
 * @property details: Optional details of the property
 * @property apiVersions: Api versions the property is available for
 * @property optional: Whether its an optional property
 */
@doc("Base class for our property types")
@discriminator("kind")
model SdkModelPropertyType {
  __raw?: ModelProperty;
  type: SdkType;
  nameInClient: string;
  description?: string;
  details?: string;
  apiVersions: string[];
  optional: boolean;
}

/**
 * Represents a property for a body model type
 *
 * @property visibility: Visiblity of the model
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
model SdkHeaderParameter extends SdkModelPropertyType {
  kind: "header";
  serializedName: string;
  collectionFormat?: "multi" | "csv" | "ssv" | "tsv" | "pipes";
}

/**
 * Represents a query parameter.
 *
 * @property serializedName: The name of the property we send over the wire to the services
 * @property collectionFormat: The format for a collection of queries
 */
model SdkQueryParameter extends SdkModelPropertyType {
  kind: "query";
  serializedName: string;
  collectionFormat?: "multi" | "csv" | "ssv" | "tsv" | "pipes";
}

/**
 * Represents a path parameter
 *
 * @property serializedName: The name of the property we send over the wire to the services
 * @property urlEncode: Whether to url encode the path parameter
 * @property validation: Any validation for the path parameter. Right now only including validation on path paramters because we only know about path params needing validation.
 */
model SdkPathParameter extends SdkModelPropertyType {
  kind: "path";
  serializedName: string;
  urlEncode: boolean;
  validation: SdkValidation;
  optional: false;
}

/**
 * Represents a body parameter.
 *
 * @property contentTypes: The content types the body parameter is valid for
 * @property defaultContentType: What content type to send by default if none are specified
 * @property optional: Whether its an optional parameter
 */
model SdkBodyParameter extends SdkModelPropertyType {
  kind: "body";
  contentTypes: string[];
  defaultContentType: string;
  optional: boolean;
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
 * @property statusCodes: Status codes that map to this response
 * @property type: The type of the response
 * @property description: Description for the response
 * @property details: Optional details of the response
 * @property headers: Headers returned as part of the response
 */
model SdkResponse {
  __raw?: unknown;
  statusCodes: (string | int32)[];
  type: SdkType;
  description?: string;
  details?: string;
  headers: SdkResponseHeader[];
}

/**
 * Base class for representation of an operation.
 *
 * @property __raw: The original TSP operation
 * @property path: Path of the operation
 * @property access: The access level of the operation
 * @property verb: Http verb of the operation
 * @property parameters: Parameters object for an operation
 * @property responses: Non-error responses of the operation
 * @property exceptions: Exceptions of the operation
 * @property description: Description of the operation
 * @property details: Optional details of the operation
 * @property summary: Summary of the operation
 * @property overloads: List of overloads of this operation if there are any
 * @property overloading: The operation this operation is overloading, if it is
 */
@discriminator("kind")
model SdkOperation {
  __raw?: unknown;
  path: string;
  access: AccessFlags;
  verb: string;
  parameters: SdkOperationParameters;
  responses: SdkResponse[];
  exceptions: SdkResponse[];
  description?: string;
  details?: string;
  summary: string;
  overloads?: SdkOperation[];
  overloading?: SdkOperation;
}

/**
 * Representation of a basic operation
 *
 * @property kind: Discriminator for the type of operation
 */
model SdkBasicOperation extends SdkOperation {
  kind: "basic";
}

/**
 * Sdk paging operation options
 *
 * @property itemsPath: Where to find the items list on a paging response
 * @property itemType: The type of each item in the items list
 * @property nextLinkPath: Where to get the next link
 */
alias SdkPagingOperationOptions = {
  itemsPath: string;
  itemType: SdkType;
  nextLinkPath: string;
};

/**
 * Representation of a paging operation
 */
model SdkPagingOperation extends SdkOperation {
  kind: "paging";
  ...SdkPagingOperationOptions;
}

/**
 * Sdk LRO operation options
 *
 * @property initialOperation: Operation to make the initial call
 */
alias SdkLroOperationOptions = {
  initialOperation: SdkBasicOperation;
};

/**
 * Representation of a lro operation
 */
model SdkLroOperation extends SdkOperation {
  kind: "lro";
  ...SdkLroOperationOptions;
}

@doc("Representation of a lro + paging operation")
model SdkLroPagingOperation extends SdkOperation {
  kind: "lropaging";
  ...SdkPagingOperationOptions;
  ...SdkLroOperationOptions;
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
 * @parameter TKind: Kind of the numeric type
 * @parameter TType: SdkType of the min / max value
 * @property minValue: Validation on the min value of the number
 * @property maxValue: Validation on the max value of the number
 */
model SdkNumericValidationTemplate<TKind, TType> extends SdkValidation {
  kind: TKind;
  minValue?: TType;
  maxValue?: TType;
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
