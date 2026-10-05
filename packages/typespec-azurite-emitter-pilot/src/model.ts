/**
 * The "server model" is this emitter's intermediate representation (analogous to the
 * GraphQL emitter's type-graph). It is built once from the compiled TypeSpec program by
 * {@link buildServerModel} and is intentionally decoupled from `@typespec/http`'s exact
 * shapes so that the render phase never has to deal with TypeSpec `Type`s directly.
 */

/** Primitive/ground shapes we are willing to represent in generated TypeScript. */
export type ServerTypeRef =
  | { kind: "string" }
  | { kind: "number" }
  | { kind: "boolean" }
  | { kind: "unknown" }
  | { kind: "model"; name: string }
  | { kind: "array"; element: ServerTypeRef }
  | { kind: "record"; element: ServerTypeRef }
  | { kind: "literal"; value: string | number | boolean };

export interface ServerModelProperty {
  readonly name: string;
  readonly type: ServerTypeRef;
  readonly optional: boolean;
  readonly doc?: string;
}

/** A named data model (request/response body shape) referenced by one or more operations. */
export interface ServerDataModel {
  readonly name: string;
  readonly properties: ServerModelProperty[];
  readonly doc?: string;
}

export type ServerParameterLocation = "path" | "query" | "header";

export interface ServerOperationParameter {
  readonly name: string;
  /** The wire name (e.g. the query-string key or header name), which may differ from `name`. */
  readonly wireName: string;
  readonly location: ServerParameterLocation;
  readonly type: ServerTypeRef;
  readonly optional: boolean;
}

export interface ServerRequestBody {
  readonly type: ServerTypeRef;
  readonly contentTypes: readonly string[];
}

export interface ServerResponseHeader {
  readonly name: string;
  readonly wireName: string;
  readonly type: ServerTypeRef;
  readonly optional: boolean;
}

export interface ServerResponse {
  /** Numeric status code, or `"*"` for a default/catch-all response. */
  readonly statusCode: number | "*";
  readonly headers: ServerResponseHeader[];
  readonly body?: ServerRequestBody;
}

export interface ServerOperation {
  /** PascalCase operation name used to derive generated symbol names. */
  readonly name: string;
  readonly verb: "get" | "put" | "post" | "patch" | "delete" | "head";
  /** The resolved route path, e.g. `/{queueName}`. */
  readonly path: string;
  readonly parameters: ServerOperationParameter[];
  readonly requestBody?: ServerRequestBody;
  readonly responses: ServerResponse[];
  readonly doc?: string;
}

/** The full intermediate model for one compiled service, ready to be rendered. */
export interface ServerModel {
  readonly serviceName: string;
  readonly operations: ServerOperation[];
  /** All named models transitively referenced by operation parameters/bodies/responses. */
  readonly models: ServerDataModel[];
  /**
   * Operations the transform phase could not represent and intentionally omitted from
   * {@link ServerModel.operations}, each with a human-readable reason. Populated when running
   * against specs exercising shapes this pilot's intermediate model doesn't (yet) cover — see
   * `test/real-queue-spec.test.ts` and the package README's "real-spec compatibility" section
   * for the concrete, evidence-based list this produces against the real Storage Queue spec.
   */
  readonly skippedOperations: readonly ServerSkippedOperation[];
}

export interface ServerSkippedOperation {
  readonly name: string;
  readonly reason: string;
}
