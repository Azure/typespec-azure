import type { Model, ModelProperty, Type } from "@typespec/compiler";

export type ServerTypeRef =
  | { kind: "string" }
  | { kind: "number" }
  | { kind: "boolean" }
  | { kind: "datetime" }
  | { kind: "unknown" }
  | { kind: "model"; name: string }
  | { kind: "array"; element: ServerTypeRef }
  | { kind: "record"; element: ServerTypeRef }
  | { kind: "literal"; value: string | number | boolean };

export interface ServerModelProperty {
  readonly name: string;
  readonly wireName: string;
  readonly type: ServerTypeRef;
  readonly sourceProperty?: ModelProperty;
  readonly optional: boolean;
  readonly xmlAttribute: boolean;
  readonly xmlUnwrapped: boolean;
  readonly doc?: string;
}

/** A named data model (request/response body shape) referenced by one or more operations. */
export interface ServerDataModel {
  readonly name: string;
  readonly wireName: string;
  readonly properties: ServerModelProperty[];
  readonly sourceModel?: Model;
  readonly doc?: string;
}

export type ServerParameterLocation = "path" | "query" | "header";

export interface ServerOperationParameter {
  readonly name: string;
  /** The wire name (e.g. the query-string key or header name), which may differ from `name`. */
  readonly wireName: string;
  readonly location: ServerParameterLocation;
  readonly type: ServerTypeRef;
  readonly sourceProperty?: ModelProperty;
  readonly optional: boolean;
}

export interface ServerRequestBody {
  readonly type: ServerTypeRef;
  readonly sourceType?: Type;
  readonly contentTypes: readonly string[];
  readonly parameterPath: string | readonly string[];
}

export interface ServerResponseHeader {
  readonly name: string;
  readonly wireName: string;
  readonly type: ServerTypeRef;
  readonly sourceProperty?: ModelProperty;
  readonly optional: boolean;
}

export interface ServerResponse {
  /** Numeric status code, or `"*"` for a default/catch-all response. */
  readonly statusCode: number | "*";
  readonly headers: ServerResponseHeader[];
  readonly body?: ServerRequestBody;
}

export interface ServerOperation {
  readonly name: string;
  readonly verb: "get" | "put" | "post" | "patch" | "delete" | "head";
  /** The full HTTP path as reported by TypeSpec, including literal query constraints. */
  readonly rawPath: string;
  /** The route path without literal query constraints. */
  readonly path: string;
  readonly literalQueryParameters: readonly ServerLiteralQueryParameter[];
  readonly parameters: ServerOperationParameter[];
  readonly requestBody?: ServerRequestBody;
  readonly responses: ServerResponse[];
  readonly doc?: string;
  /** TypeSpec interface declaring the operation, when available. */
  readonly interfaceName?: string;
}

export interface ServerLiteralQueryParameter {
  readonly name: string;
  readonly value: string;
}

export interface ServerModel {
  readonly serviceName: string;
  readonly operations: ServerOperation[];
  readonly models: ServerDataModel[];
  readonly skippedOperations: readonly ServerSkippedOperation[];
}

export interface ServerSkippedOperation {
  readonly name: string;
  readonly reason: string;
}
