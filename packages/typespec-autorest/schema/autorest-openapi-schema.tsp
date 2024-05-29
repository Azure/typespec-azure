/**
 * This document is used to specify the order of properties in the output autorest.
 * The order defined in the TypeSpec will be respected in the generated swagger.
 */
import "@typespec/json-schema";

using TypeSpec.JsonSchema;

namespace AutorestOpenAPISchema;

@jsonSchema
model AutorestOpenAPISchema {
  swagger: "2.0";
  info: Info;
  basePath?: string;
  schemes?: Scheme[];
  host?: string;
  `x-ms-parameterized-host`?: XmsParameterizedHost;
  produces?: string[];
  consumes?: string[];
  security?: SecurityRequirement[];
  securityDefinitions?: SecurityDefinitions;
  tags?: Tag[];
  paths: Paths;
  `x-ms-paths`?: Paths;
  definitions?: Record<Schema>;
  parameters?: Record<Parameter>;
  responses?: Record<Response>;
  externalDocs?: ExternalDocs;
  `x-ms-permissions`?: XmsPermissions;
}

@extension("x-ordering", Json<"url">)
model Paths is Record<PathItem>;

model Contact {
  name?: string;
  url?: string;
  email?: string;
}

model License {
  name: string;
  url?: string;
}

model Info {
  title: string;
  version: string;
  description?: string;
  termsOfService?: string;
  contact?: Contact;
  license?: License;
}

alias Scheme = "http" | "https" | "ws" | "wss";

model XmsParameterizedHost {
  hostTemplate?: string;
  useSchemePrefix?: boolean;
  positionInOperation?: "first" | "last";
  parameters?: Parameter[];
}

model SecurityRequirement is Record<string[]>;

model SecurityDefinitions is Record<SecurityScheme>;

model SecurityScheme {
  type: string;
  description?: string;
  name?: string;
  in?: string;
  flow?: string;
  authorizationUrl?: url;
  scopes?: Record<string>;
}

model ExternalDocs {
  description?: string;
  url: string;
}

model Tag {
  name: string;
  description?: string;
  externalDocs?: ExternalDocs;
}

model XmsPermissions {
  actions?: string;
  dataActions?: string;
  rolesWithThesePermissions?: string;
  moreInfoLink?: string;
}

model examples {}

model Parameter {
  name: string;
  in: "body" | "header" | "query" | "cookie";
  description?: string;
  required?: boolean;
  schema?: Schema;
  type?: string;
  format?: string;
  items?: Schema;
  collectionFormat: string;
  default?: unknown;
  ...SchemaAttributes;
  `enum`?: string[];
  `x-ms-enum`?: XmsEnum;
  `x-ms-parameter-grouping`?: XmsParameterGrouping;
  `x-ms-parameter-location`?: "client" | "method";
  `x-ms-api-version`?: boolean;
  `x-ms-client-default`?: unknown;
  `x-ms-header-collection-prefix`?: string;
  `x-ms-client-name`?: string;
  `x-ms-client-flatten`?: boolean;
}

model Response {
  description: string;
  schema?: Schema;
  headers?: Headers;
  `x-ms-error-response`?: boolean;
  examples?: Examples;
}

model XmsParameterGrouping {
  name?: string;
  postfix?: string;
}

// https://github.com/microsoft/typespec/issues/2091
// model Examples is Record<unknown>;
model Examples is Record<{}>;

model XmsPageable {
  nextLinkName?: string | null;
  itemName?: string | null;
  operationName?: string | null;
}

@doc("Indicates whether the operation is long running (asynchronous). `true` value indicates that it is a long running operation.")
model XmsLongRunningOperationOptions {
  @doc("""
How to determine the final state of the operation. Possible Values:
- `azure-async-operation` - poll until terminal state, the final response will be available at the uri pointed to by the header `Azure-AsyncOperation`
- `location`  - poll until terminal state, the final response will be available at the uri pointed to by the header `Location`
- `operation-location` - poll until terminal state, the final response will be available at the uri pointed to by the header `Operation-Location`
""")
  `final-state-via`:
    | "azure-async-operation"
    | "location"
    | "original-uri"
    | "operation-location"
    | "final-state-schema";

  `final-state-schema`?: Schema;
}

/** Describes the 'x-ms-examples' extension. */
model XmsExamples is Record<{}>;

model Operation {
  /** A unique identifier of the operation. */
  operationId?: string;

  tags?: string[];

  @doc("A brief summary of the operation.")
  summary?: string;

  @doc("A longer description of the operation, GitHub Flavored Markdown is allowed.")
  description?: string;

  externalDocs?: ExternalDocs;

  @doc("A list of MIME types the API can produce.")
  produces?: string[];

  @doc("A list of MIME types the API can consume.")
  consumes?: string[];

  parameters?: Parameter[];
  responses: Record<Response>;
  schemes?: Scheme[];
  deprecated?: boolean;
  security?: SecurityRequirement[];
  `x-ms-client-name`?: string;
  `x-ms-examples`?: XmsExamples;
  `x-ms-long-running-operation-options`?: XmsLongRunningOperationOptions;
  `x-ms-long-running-operation`?: boolean;
  `x-ms-odata`?: string;
  `x-ms-pageable`?: XmsPageable;
  `x-ms-request-id`?: string;
}

model PathItem {
  $ref?: string;
  parameters?: Parameter[];
  get?: Operation;
  put?: Operation;
  post?: Operation;
  patch?: Operation;
  delete?: Operation;
  options?: Operation;
  head?: Operation;
}

@minValue(0)
scalar nonNegativeInteger extends safeint;

model XmsEnum {
  name?: string;
  modelAsString?: boolean;
  oldModelAsString?: boolean;
  modelAsExtensible?: boolean;
  values?: XmsEnumValue[];
}

model XmsEnumValue {
  name?: string;
  value: unknown;
  description?: string;
  allowedValues?: unknown[];
}

model xml {
  name?: string;
  `namespace`?: string;
  prefix?: string;
  attribute?: boolean;
  wrapped?: boolean;
}

model XmsMutability is ("create" | "read" | "update")[];

model SchemaAttributes {
  minimum?: float64;
  exclusiveMinimum?: boolean;
  maximum?: float64;
  exclusiveMaximum?: boolean;
  minLength?: nonNegativeInteger;
  maxLength?: nonNegativeInteger;
  pattern?: string;
  minItems?: nonNegativeInteger;
  maxItems?: nonNegativeInteger;
  uniqueItems?: boolean;
  minProperties?: nonNegativeInteger;
  maxProperties?: nonNegativeInteger;
  multipleOf?: float64;
}

model Schema {
  /** Ref to another schema */
  $ref?: string;

  /** Schema type */
  type?: string;

  format?: string;
  title?: string;
  description?: string;
  default?: unknown;
  ...SchemaAttributes;
  properties?: SchemaProperties;
  discriminator?: string;
  required?: string[];
  `enum`?: string[];
  `x-ms-enum`?: XmsEnum;
  `x-nullable`?: boolean;
  additionalProperties?: Schema | boolean;
  items?: Schema;
  allOf?: Schema[];
  readOnly?: boolean;
  xml?: xml;
  externalDocs?: ExternalDocs;
  example?: unknown;
  `x-ms-azure-resource`?: boolean;
  `x-ms-client-flatten`?: boolean;
  `x-ms-client-default`?: unknown;
  `x-ms-client-name`?: string;
  `x-ms-discriminator-value`?: string;
  `x-ms-external`?: boolean;
  `x-ms-identifiers`?: string[];
  `x-ms-mutability`?: XmsMutability;
  `x-ms-secret`?: boolean;
}

@extension("x-ordering", Json<"keep">)
model SchemaProperties is Record<Schema>;

@doc("A deterministic version of a JSON Schema object.")
model fileSchema {
  format?: string;
  title?: string;
  description?: string;
  default?: unknown;
  required?: string[];
  type: "file";
  readOnly?: boolean;
  externalDocs?: ExternalDocs;
  example?: unknown;
}

model Headers is Record<Header>;

alias CollectionFormat = "csv" | "ssv" | "tsv" | "pipes";

scalar maxItems extends nonNegativeInteger;

model Header {
  type: "string" | "number" | "integer" | "boolean" | "array";
  format?: string;
  description?: string;
  items?: Schema;
  collectionFormat?: CollectionFormat;
  default?: unknown;
  ...SchemaAttributes;
  `enum`?: string[];
  `x-ms-client-name`?: string;
  `x-ms-enum`?: XmsEnum;
  `x-ms-header-collection-prefix`?: string;
  `x-ms-secret`?: boolean;
  `x-nullable`?: boolean;
}
