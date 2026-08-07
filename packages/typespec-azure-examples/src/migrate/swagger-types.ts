/**
 * Types describing the *inputs* to `examples-migrate`: the classic Swagger `x-ms-examples`
 * extension and the referenced example JSON documents.
 */

/** Parameter location as declared on a Swagger operation/path parameter. */
export type ParameterLocation = "path" | "query" | "header" | "body" | "formData";

/** A Swagger parameter object (or a `$ref` to one). */
export interface SwaggerParameter {
  readonly name?: string;
  readonly in?: ParameterLocation;
  readonly $ref?: string;
}

/** A single Swagger operation carrying `x-ms-examples`. */
export interface SwaggerOperation {
  readonly operationId?: string;
  readonly parameters?: SwaggerParameter[];
  readonly "x-ms-examples"?: Record<string, { readonly $ref?: string }>;
}

/** The subset of a Swagger document `examples-migrate` reads. */
export interface SwaggerDocument {
  readonly info?: { readonly title?: string; readonly version?: string };
  readonly parameters?: Record<string, SwaggerParameter>;
  readonly paths?: Record<string, SwaggerPathItem>;
}

/** A Swagger path item: HTTP methods plus optional path-level `parameters`. */
export interface SwaggerPathItem {
  readonly parameters?: SwaggerParameter[];
  readonly [method: string]: unknown;
}

/** The referenced `x-ms-examples` example document. */
export interface XmsExampleDoc {
  readonly operationId?: string;
  readonly title?: string;
  readonly parameters?: Record<string, unknown>;
  readonly responses?: Record<string, XmsExampleResponse>;
}

export interface XmsExampleResponse {
  readonly headers?: Record<string, unknown>;
  readonly body?: unknown;
}

/** The HTTP methods that can carry an operation on a Swagger path item. */
export const HTTP_METHODS = ["get", "put", "post", "delete", "options", "head", "patch"] as const;
