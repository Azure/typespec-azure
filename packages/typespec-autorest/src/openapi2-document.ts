import { ExtensionKey } from "@typespec/openapi";

export type Extensions = {
  [key in ExtensionKey]?: unknown;
};

export interface OpenAPI2Document extends Extensions {
  swagger: "2.0";

  /**
   * Provides metadata about the API. The metadata can be used by the clients if needed.
   */
  info: OpenAPI2Info;

  /** Additional external documentation. */
  externalDocs?: OpenAPI2ExternalDocs;

  /** A list of MIME types the APIs can produce. This is global to all APIs but can be overridden on specific API calls */
  produces?: string[];

  /** A list of MIME types the APIs can consume. This is global to all APIs but can be overridden on specific API calls */
  consumes?: string[];

  /** The transfer protocol of the API. Values MUST be from the list: "http", "https", "ws", "wss". */
  schemes?: string[];

  /** The available paths and operations for the API */
  paths: Record<string, OpenAPI2PathItem>;

  /**
   * Additional paths and operations that cannot be used in `paths` as the url is not unique.
   * This can be used to provide operation overload using a query param.
   * @example "/foo?type=abc" returning FooA and "/foo?type=xyz" returning FooB are not allowed in `paths` as there is query params.
   */
  "x-ms-paths"?: Record<string, OpenAPI2PathItem>;

  /**
   * The host (name or ip) serving the API. This MUST be the host only and does not include the scheme nor sub-paths. It MAY include a port.
   * If the host is not included, the host serving the documentation is to be used (including the port). The host does not support path templating.
   */
  host?: string;

  /**
   * When used, replaces the standard OpenAPI "host" attribute with a host that contains variables to be replaced as part of method execution or client construction, very similar to how path parameters work.
   */
  "x-ms-parameterized-host"?: XMSParameterizedHost;

  /** A declaration of which security schemes are applied for the API as a whole. The list of values describes alternative security schemes that can be used (that is, there is a logical OR between the security requirements). Individual operations can override this definition */
  security?: OpenAPI2SecurityRequirement[];

  /** Security scheme definitions that can be used across the specification */
  securityDefinitions?: Record<string, OpenAPI2SecurityScheme>;

  /**
   * A list of tags used by the specification with additional metadata.
   * The order of the tags can be used to reflect on their order by the parsing tools.
   * Not all tags that are used by the Operation Object must be declared.
   * The tags that are not declared may be organized randomly or based on the tools' logic. Each tag name in the list MUST be unique.
   */
  tags?: OpenAPI2Tag[];

  /** Data types that can be consumed and produced by operations */
  definitions?: Record<string, OpenAPI2Schema>;

  /** parameters that can be used across operations */
  parameters?: Record<string, OpenAPI2Parameter>;
}

export interface XMSParameterizedHost {
  /**
   * Specifies the parameterized template for the host.
   */
  hostTemplate: string;

  /**
   * Specifies whether to prepend the default scheme a.k.a protocol to the base uri of client.
   * @default true
   */
  useSchemePrefix?: boolean;

  /**
   * The list of parameters that are used within the hostTemplate.
   * This can include both reference parameters as well as explicit parameters. Note that "in" is required and must be set to "path".
   * The reference parameters will be treated as global parameters and will end up as property of the client.
   */
  parameters?: OpenAPI2Parameter[];
}

export interface OpenAPI2Info extends Extensions {
  title: string;
  description?: string;
  termsOfService?: string;
  version: string;
}

export interface OpenAPI2ExternalDocs {
  url: string;
  description?: string;
}

export interface OpenAPI2Tag extends Extensions {
  name: string;
  description?: string;
  externalDocs?: OpenAPI2ExternalDocs;
}

export type JsonType = "array" | "boolean" | "integer" | "number" | "object" | "string";

/**
 * Autorest allows a few properties to be next to $ref of a property.
 */
export type OpenAPI2SchemaRefProperty = Ref<OpenAPI2Schema> &
  Pick<OpenAPI2Schema, "readOnly" | "description" | "default" | "x-ms-mutability" | "title"> & {
    /**
     * Provide a different name to be used in the client.
     */
    "x-ms-client-name"?: string;
  };

export type OpenAPI2SchemaProperty = OpenAPI2SchemaRefProperty | OpenAPI2Schema;

export type OpenAPI2Schema = Extensions & {
  /**
   * The JSON type for the schema
   */
  type?: JsonType;

  /**
   * The extending format for the previously mentioned type.
   */
  format?: string;

  /**
   * This attribute is a string that provides a short description of the schema.
   */
  title?: string;

  /**
   * This attribute is a string that provides a full description of the schema
   */
  description?: string;

  /**
   * This attribute is an object with property definitions that define the
   * valid values of instance object property values. When the instance
   * value is an object, the property values of the instance object MUST
   * conform to the property definitions in this object. In this object,
   * each property definition's value MUST be a schema, and the property's
   * name MUST be the name of the instance property that it defines.  The
   * instance property value MUST be valid according to the schema from
   * the property definition. Properties are considered unordered, the
   * order of the instance properties MAY be in any order.
   */
  properties?: Record<string, OpenAPI2SchemaProperty>;

  /**
   * A list of property names that are required to be sent from the client to the server.
   */
  required?: string[];

  /** Swagger allows combining and extending model definitions using the allOf property of JSON Schema, in effect offering model composition.
   * allOf takes in an array of object definitions that are validated independently but together compose a single object.
   * While composition offers model extensibility, it does not imply a hierarchy between the models.
   * To support polymorphism, Swagger adds the support of the discriminator field.
   * When used, the discriminator will be the name of the property used to decide which schema definition is used to validate the structure of the model.
   * As such, the discriminator field MUST be a required field. The value of the chosen property has to be the friendly name given to the model under the
   * definitions property. As such, inline schema definitions, which do not have a given id, cannot be used in polymorphism. */
  allOf?: Refable<OpenAPI2Schema>[];

  /**
   * indicates that additional unlisted properties can exist in this schema
   */
  additionalProperties?: boolean | Refable<OpenAPI2Schema>;

  /**
   * Adds support for polymorphism. The discriminator is the schema property name that is used to differentiate between other schema that inherit this schema.
   * The property name used MUST be defined at this schema and it MUST be in the required property list. When used, the value MUST be the name of this schema
   * or any schema that inherits it.
   */
  discriminator?: string;

  /**
   * Relevant only for Schema "properties" definitions. Declares the property as "read only". This means that it MAY be sent as part of a response but MUST NOT
   * be sent as part of the request. Properties marked as readOnly being true SHOULD NOT be in the required list of the defined schema. Default value is false.
   */
  readOnly?: boolean;

  /**
   * Restrict a value to a fixed set of values. It must be an array with at least one element, where each element is unique.
   */
  enum?: (string | number | boolean)[];

  "x-ms-enum"?: {
    /** Name of the enum. */
    name?: string;
    /** If the enum should be extensible. */
    modelAsString?: boolean;

    /**
     * Provide alternative name and description for enum values.
     */
    values?: Array<{
      name: string;
      value: string | number;
      description: string | undefined;
    }>;
  };

  /**
   * Declares the value of the property that the server will use if none is provided,
   * for example a "count" to control the number of results per page might default to 100 if not supplied by the client in the request.
   *
   * "default" has no meaning for required parameters.) See https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-6.2. Unlike JSON Schema this value MUST conform to the defined type for this parameter. */
  default?: string | boolean | number | Record<string, unknown>;

  /**
   * the maximum value for the property
   *
   * if "exclusiveMaximum" is not present, or has boolean value false, then the instance is valid if it is lower than, or equal to, the value of "maximum";
   *
   * if "exclusiveMaximum" has boolean value true, the instance is valid if it is strictly lower than the value of "maximum".
   */
  maximum?: number;

  /** indicates that the maximum is exclusive of the number given */
  exclusiveMaximum?: boolean;

  /**
   * the minimum value for the property
   *
   * if "exclusiveMinimum" is not present, or has boolean value false, then the instance is valid if it is greater than, or equal to, the value of "minimum";
   *
   * if "exclusiveMinimum" has boolean value true, the instance is valid if it is strictly greater than the value of "minimum".
   */
  minimum?: number;

  /**
   * indicates that the minimum is exclusive of the number given
   */
  exclusiveMinimum?: boolean;

  /**
   * A string instance is valid against this keyword if its length is less than, or equal to, the value of this keyword.
   */
  maxLength?: number;

  /**
   * A string instance is valid against this keyword if its length is greater than, or equal to, the value of this keyword.
   */
  minLength?: number;

  /**
   * A string instance is considered valid if the regular expression matches the instance successfully.
   */
  pattern?: string;

  /**
   * An array instance is valid against "maxItems" if its size is less than, or equal to, the value of this keyword.
   */
  maxItems?: number;

  /**
   * An array instance is valid against "minItems" if its size is greater than, or equal to, the value of this keyword.
   */
  minItems?: number;

  /**
   * if this keyword has boolean value false, the instance validates successfully.  If it has boolean value true, the instance validates successfully if all of its elements are unique.
   */
  uniqueItems?: boolean;

  /** Describes the type of items in the array.  */
  items?: Refable<OpenAPI2Schema>;

  /**
   * An object instance is valid against "maxProperties" if its number of properties is less than, or equal to, the value of this keyword.
   */
  maxProperties?: number;

  /**
   * An object instance is valid against "minProperties" if its number of properties is greater than, or equal to, the value of this keyword.
   */
  minProperties?: number;

  "x-ms-mutability"?: string[];
};

export type OpenAPI2FileSchema = {
  type: "file";
  format?: string;
  title?: string;
  description?: string;
  default?: unknown;
  required?: string[];
  readonly?: boolean;
  externalDocs?: OpenAPI2ExternalDocs;
  example?: unknown;
};

export type OpenAPI2ParameterType = OpenAPI2Parameter["in"];

export interface OpenAPI2HeaderDefinition {
  type: "string" | "number" | "integer" | "boolean" | "array";
  collectionFormat?: "csv" | "ssv" | "tsv" | "pipes";
  description?: string;
  format?: string;
  items?: PrimitiveItems;
}

export type OpenAPI2Parameter =
  | OpenAPI2BodyParameter
  | OpenAPI2HeaderParameter
  | OpenAPI2FormDataParameter
  | OpenAPI2QueryParameter
  | OpenAPI2PathParameter;

export interface OpenAPI2ParameterBase extends Extensions {
  name: string;
  description?: string;
  required?: boolean;

  /**
   * Provide a different name to be used in the client.
   */
  "x-ms-client-name"?: string;
  "x-ms-parameter-location"?: string;
}

export interface OpenAPI2BodyParameter extends OpenAPI2ParameterBase {
  in: "body";
  schema: OpenAPI2Schema;
  allowEmptyValue?: boolean;
  example?: unknown;

  "x-ms-client-flatten"?: boolean;
}

export interface OpenAPI2HeaderParameter extends OpenAPI2HeaderDefinition, OpenAPI2ParameterBase {
  name: string;
  in: "header";
  required?: boolean;
  default?: unknown;
}

export interface OpenAPI2FormDataParameter extends OpenAPI2ParameterBase {
  name: string;
  in: "formData";
  type: "string" | "number" | "integer" | "boolean" | "array" | "file";
  collectionFormat?: "csv" | "ssv" | "tsv" | "pipes" | "multi";
  schema?: OpenAPI2Schema;
  allowEmptyValue?: boolean;
  description?: string;
  required?: boolean;
  format?: string;
  example?: unknown;
  enum?: string[];
  allOf?: OpenAPI2Schema[];
  default?: unknown;
  items?: PrimitiveItems;

  "x-ms-client-flatten"?: boolean;
}

export interface PrimitiveItems {
  type: "string" | "number" | "integer" | "boolean" | "array" | "file";
  format?: string;
  items?: PrimitiveItems;
  default?: unknown;
}

export interface OpenAPI2PathParameter extends OpenAPI2ParameterBase {
  name: string;
  in: "path";
  type: "string" | "number" | "integer" | "boolean" | "array";
  collectionFormat?: "csv" | "ssv" | "tsv" | "pipes";
  allowEmptyValue?: boolean;
  description?: string;
  required?: boolean;
  format?: string;
  enum?: string[];
  items?: PrimitiveItems;
  "x-ms-skip-url-encoding"?: boolean;
  default?: unknown;
}

export interface OpenAPI2QueryParameter extends OpenAPI2ParameterBase {
  name: string;
  in: "query";
  type: "string" | "number" | "integer" | "boolean" | "array";
  collectionFormat?: "csv" | "ssv" | "tsv" | "pipes" | "multi";
  allowEmptyValue?: boolean;
  description?: string;
  required?: boolean;
  format?: string;
  enum?: string[];
  items?: PrimitiveItems;
  default?: unknown;
}

export type HttpMethod = "get" | "put" | "post" | "delete" | "options" | "head" | "patch" | "trace";

/**
 * Describes the operations available on a single path. A Path Item may be empty, due to ACL constraints. The path itself is still exposed to the documentation viewer but they will not know which operations and parameters are available.
 *
 * @see https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#pathItemObject
 */
export type OpenAPI2PathItem = {
  [method in HttpMethod]?: OpenAPI2Operation;
} & { parameters?: OpenAPI2Parameter[] } & Extensions;

export type OpenAPI2Operation = Extensions & {
  /** A verbose explanation of the operation behavior. Commonmark syntax can be used for rich text representation. */
  description?: string;

  /**A short summary of what the operation does. */
  summary?: string;

  /** Additional external documentation. */
  externalDocs?: OpenAPI2ExternalDocs;

  responses?: OpenAPI2Responses;

  /** Unique string used to identify the operation. The id MUST be unique among all operations described in the API. Tools and libraries MAY use the operationId to uniquely identify an operation, therefore, it is recommended to follow common programming naming conventions. */
  operationId?: string;

  /**
   * A list of MIME types the operation can produce. This overrides the produces definition at the Swagger Object.
   * An empty value MAY be used to clear the global definition. Value MUST be as described under Mime Types.
   */
  produces?: string[];

  /**
   * A list of MIME types the operation can consume. This overrides the consumes definition at the Swagger Object.
   * An empty value MAY be used to clear the global definition. Value MUST be as described under Mime Types.
   */
  consumes?: string[];

  /**
   * A list of parameters that are applicable for this operation.
   * If a parameter is already defined at the Path Item, the new definition will override it, but can never remove it.
   * The list MUST NOT include duplicated parameters. A unique parameter is defined by a combination of a name and location.
   */
  parameters: Refable<OpenAPI2Parameter>[];

  /** The transfer protocol for the operation. Values MUST be from the list: "http", "https", "ws", "wss". The value overrides the Swagger Object schemes definition.  */
  schemes?: string[];

  /** Declares this operation to be deprecated. Usage of the declared operation should be refrained. Default value is false.  */
  deprecated?: boolean;

  /**  declaration of which security schemes are applied for this operation. The list of values describes alternative security schemes that can be used (that is, there is a logical OR between the security requirements). This definition overrides any declared top-level security. To remove a top-level security declaration, an empty array can be used. */
  security?: OpenAPI2SecurityScheme[];

  /** A list of tags for API documentation control. Tags can be used for logical grouping of operations by resources or any other qualifier. */
  tags?: Array<string>;

  "x-ms-examples"?: Record<string, Ref<unknown>>;
  "x-ms-pageable"?: XmsPageable;

  "x-ms-long-running-operation"?: boolean;

  "x-ms-long-running-operation-options"?: XMSLongRunningOperationOptions;
};

export type XMSLongRunningFinalState =
  | "azure-async-operation"
  | "location"
  | "original-uri"
  | "operation-location"
  | "final-state-schema";

export type XMSLongRunningOperationOptions = {
  "final-state-via": XMSLongRunningFinalState;

  "final-state-schema"?: string;
};

/**
 * Model for x-ms-pageable extension.
 * https://github.com/Azure/autorest/blob/main/docs/extensions/readme.md#x-ms-pageable
 */
export type XmsPageable = {
  /** Name of the property containing url to the next link.  */
  nextLinkName: string;
  /** Name of the property containing the page items. Default: "value" */
  itemName?: string;
  /** Specifies the name (operationId) of the operation for retrieving the next page. Default: "<operationId>Next" */
  operationName?: string;
};

export type OpenAPI2StatusCode = string | "default" | "1XX" | "2XX" | "3XX" | "4XX" | "5XX";

/**
 * An object to hold responses to be reused across operations. Response definitions can be referenced to the ones defined here.
 * This does not define global operation responses.
 *
 * Keys are the name for the response that it defines.
 *
 * @see https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#responses-definitions-object
 */
export type OpenAPI2Responses = {
  [status: OpenAPI2StatusCode]: Refable<OpenAPI2Response>;
} & Extensions;

/**
 * Describes a single response from an API Operation.
 *
 * @see https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#response-object
 *
 */
export interface OpenAPI2Response {
  /** A short description of the response. Commonmark syntax can be used for rich text representation */
  description: string;
  /** A definition of the response structure. It can be a primitive, an array or an object. If this field does not exist, it means no content is returned as part of the response. As an extension to the Schema Object, its root type value may also be "file". This SHOULD be accompanied by a relevant produces mime-type. */
  schema?: OpenAPI2Schema | OpenAPI2FileSchema;
  /** A list of headers that are sent with the response. */
  headers?: Record<string, OpenAPI2HeaderDefinition>;
  /** An example of the response message. */
  examples?: Record<string, OpenAPI2Example>;
  /** Indicates whether the response status code should be treated as an error response. */
  "x-ms-error-response"?: boolean;
}

/**
 *  Allows sharing examples for operation responses.
 *
 * @see https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#exampleObject
 */
export interface OpenAPI2Example {
  /** The name of the property MUST be one of the Operation produces values (either implicit or inherited). The value SHOULD be an example of what such a response would look like. */
  [mineType: string]: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Ref<T> {
  $ref: string;
}

export type Refable<T> = Ref<T> | T;

/**
 * Lists the required security schemes to execute this operation. The object can have multiple security schemes declared in it which are all required (that is, there is a logical AND between the schemes).
 *
 * The name used for each property MUST correspond to a security scheme declared in the Security Definitions.
 *
 * @see /https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#security-requirement-object
 */
export type OpenAPI2SecurityRequirement = Record<string, string[]>;

/**
 * Allows the definition of a security scheme that can be used by the operations. Supported schemes are basic authentication, an API key (either as a header or as a query parameter) and OAuth2's common flows (implicit, password, application and access code).
 *
 * @see https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#security-scheme-object
 */
export interface OpenAPI2SecuritySchemeBase extends Extensions {
  /**  The type of the security scheme. Valid values are "basic", "apiKey" or "oauth2". */
  type: "basic" | "apiKey" | "oauth2";

  /** A short description for security scheme. */
  description?: string;
}

/** Basic Auth Security Scheme */
export interface OpenAPI2BasicAuthenticationSecurityScheme extends OpenAPI2SecuritySchemeBase {
  type: "basic";
}

/** ApiKey Security Scheme */
export interface OpenAPI2ApiKeySecurityScheme extends OpenAPI2SecuritySchemeBase {
  /** ApiKey  */
  type: "apiKey";
  /**
   * The name of the header or query parameter to be used.
   */
  name: string;

  /** The location of the API key. Valid values are "query" or "header". */
  in: "query" | "header";
}

export type OpenAPI2OAuth2FlowType = "implicit" | "password" | "application" | "accessCode";
export interface OpenAPI2OAuthSecurityBase extends OpenAPI2SecuritySchemeBase {
  type: "oauth2";

  /** The flow used by the OAuth2 security scheme */
  flow: OpenAPI2OAuth2FlowType;

  /** The available scopes for the OAuth2 security scheme. A map between the scope name and a short description for it. */
  scopes: Record<string, string>;
}

/** OAuth2 Implicit Security Scheme */
export interface OpenAPI2OAuth2ImplicitSecurityScheme extends OpenAPI2OAuthSecurityBase {
  flow: "implicit";

  /** The authorization URL to be used for this flow. This MUST be in the form of a URL. */
  authorizationUrl: string;
}

/** OAuth2 Password Security Scheme */
export interface OpenAPI2OAuth2PasswordSecurityScheme extends OpenAPI2OAuthSecurityBase {
  flow: "password";

  /** The token URL to be used for this flow. This MUST be in the form of a URL. */
  tokenUrl: string;
}

/** OAuth2 Application Security Scheme */
export interface OpenAPI2OAuth2ApplicationSecurityScheme extends OpenAPI2OAuthSecurityBase {
  flow: "application";

  /** The token URL to be used for this flow. This MUST be in the form of a URL. */
  tokenUrl: string;
}

/** OAuth2 Security Code Security Scheme */
export interface OpenAPI2OAuth2AccessCodeSecurityScheme extends OpenAPI2OAuthSecurityBase {
  flow: "accessCode";

  /** The authorization URL to be used for this flow. This MUST be in the form of a URL. */
  authorizationUrl: string;

  /** The token URL to be used for this flow. This MUST be in the form of a URL. */
  tokenUrl: string;
}

/**
 * Allows the definition of a security scheme that can be used by the operations. Supported schemes are basic authentication, an API key (either as a header or as a query parameter) and OAuth2's common flows (implicit, password, application and access code).
 *
 * @see https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#security-scheme-object
 */
export type OpenAPI2SecurityScheme =
  | OpenAPI2BasicAuthenticationSecurityScheme
  | OpenAPI2OAuth2AccessCodeSecurityScheme
  | OpenAPI2OAuth2ApplicationSecurityScheme
  | OpenAPI2OAuth2ImplicitSecurityScheme
  | OpenAPI2OAuth2PasswordSecurityScheme
  | OpenAPI2ApiKeySecurityScheme;
