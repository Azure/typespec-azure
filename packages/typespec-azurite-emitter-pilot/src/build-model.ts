import {
  getDoc,
  isArrayModelType,
  isRecordModelType,
  type Model,
  type ModelProperty,
  type Program,
  type Scalar,
  type Type,
} from "@typespec/compiler";
import {
  getAllHttpServices,
  type HttpOperation,
  type HttpOperationParameter,
  type HttpOperationResponse,
  type HttpPayloadBody,
} from "@typespec/http";
import type {
  ServerDataModel,
  ServerModel,
  ServerModelProperty,
  ServerOperation,
  ServerOperationParameter,
  ServerParameterLocation,
  ServerRequestBody,
  ServerResponse,
  ServerResponseHeader,
  ServerSkippedOperation,
  ServerTypeRef,
} from "./model.js";

/** Numeric TypeSpec scalar names that map to the TS `number` type. */
const NUMERIC_SCALARS = new Set([
  "int8",
  "int16",
  "int32",
  "int64",
  "integer",
  "safeint",
  "uint8",
  "uint16",
  "uint32",
  "uint64",
  "float",
  "float32",
  "float64",
  "decimal",
  "decimal128",
  "numeric",
]);

/** Scalar names that derive from `string` (e.g. `url`, `uuid`) and should map to TS `string`. */
function isStringLikeScalar(scalar: Scalar): boolean {
  let current: Scalar | undefined = scalar;
  while (current) {
    if (current.name === "string") return true;
    current = current.baseScalar;
  }
  return false;
}

function isNumericLikeScalar(scalar: Scalar): boolean {
  let current: Scalar | undefined = scalar;
  while (current) {
    if (NUMERIC_SCALARS.has(current.name)) return true;
    current = current.baseScalar;
  }
  return false;
}

/**
 * Converts the operation name (e.g. `listQueues`) to a stable PascalCase symbol name
 * (e.g. `ListQueues`) used for generated TypeScript identifiers.
 */
export function toPascalCase(name: string): string {
  return name.length === 0 ? name : name[0].toUpperCase() + name.slice(1);
}

/**
 * Builds the intermediate {@link ServerModel} for the (single) HTTP service found in the
 * compiled program. This is the "transform" phase: it walks `@typespec/http` metadata and
 * TypeSpec model types and produces a simplified, render-ready representation.
 *
 * Operations the transform phase can't represent (because they exercise a TypeSpec/HTTP shape
 * this pilot's intermediate model doesn't cover) are skipped rather than aborting the whole
 * build — see `skippedOperations` on the returned {@link ServerModel}, and the "real-spec
 * compatibility" section of this package's README for the concrete gap list this produces
 * against the real, unchanged Storage Queue TypeSpec.
 */
export function buildServerModel(program: Program): ServerModel {
  const [services] = getAllHttpServices(program);
  const service = services[0];
  const modelRegistry = new Map<string, ServerDataModel>();
  // Anonymous TypeSpec models (e.g. inline `{ ... }` response/error bodies) have no `name`, so
  // they can't be keyed by name the way named models are. Tracking them by object identity
  // (rather than by the shared empty-string/placeholder name) avoids two *different* anonymous
  // shapes silently colliding into one cached entry — see the README's "AnonymousModel identity"
  // gap note, found while running this against the real Storage Queue spec (which has 17
  // operations that all happen to share one identical anonymous error-response shape, which
  // made the pre-fix bug easy to miss on this spec in particular but still real).
  const anonymousModelNames = new Map<Model, string>();

  const operations: ServerOperation[] = [];
  const skippedOperations: ServerSkippedOperation[] = [];
  const usedOperationNames = new Set<string>();
  for (const op of service?.operations ?? []) {
    try {
      const built = buildOperation(program, op, modelRegistry, anonymousModelNames);
      // Real Storage Queue finding: both the `Service` and `Queue` TypeSpec interfaces declare
      // a `getProperties` operation, which previously collided on one `GetProperties` generated
      // TS symbol (`TS2300: Duplicate identifier`) once both interfaces' operations landed in
      // the same flat models.ts/operations.ts/handlers.ts output. Qualifying by the containing
      // TypeSpec interface name (when present, and only when needed to disambiguate) keeps
      // names close to the operation's own name while still being collision-free, similar in
      // spirit to how Azurite's own generated code keeps `IServiceHandler`/`IQueueHandler` as
      // separate interfaces rather than one flat method bag.
      let qualifiedName = built.name;
      if (usedOperationNames.has(qualifiedName)) {
        const interfaceName = op.operation.interface?.name;
        qualifiedName = interfaceName ? `${toPascalCase(interfaceName)}${built.name}` : built.name;
      }
      qualifiedName = disambiguate(qualifiedName, usedOperationNames);
      usedOperationNames.add(qualifiedName);
      operations.push(qualifiedName === built.name ? built : { ...built, name: qualifiedName });
    } catch (error) {
      skippedOperations.push({
        name: toPascalCase(op.operation.name),
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    serviceName: service?.namespace.name ?? "Service",
    operations,
    models: [...modelRegistry.values()],
    skippedOperations,
  };
}

/** Appends a numeric suffix if `name` is still taken after interface-name qualification. */
function disambiguate(name: string, used: ReadonlySet<string>): string {
  if (!used.has(name)) return name;
  let suffix = 2;
  while (used.has(`${name}${suffix}`)) suffix++;
  return `${name}${suffix}`;
}

function buildOperation(
  program: Program,
  op: HttpOperation,
  modelRegistry: Map<string, ServerDataModel>,
  anonymousModelNames: Map<Model, string>,
): ServerOperation {
  const parameters = op.parameters.parameters.map((p) =>
    buildParameter(program, p, modelRegistry, anonymousModelNames),
  );

  const requestBody = op.parameters.body
    ? buildRequestBody(program, op.parameters.body, modelRegistry, anonymousModelNames)
    : undefined;

  const responses = op.responses.map((r) =>
    buildResponse(program, r, modelRegistry, anonymousModelNames),
  );

  return {
    name: toPascalCase(op.operation.name),
    verb: op.verb,
    path: op.path,
    parameters,
    requestBody,
    responses,
    doc: getDocHelper(program, op.operation),
  };
}

function buildParameter(
  program: Program,
  param: HttpOperationParameter,
  modelRegistry: Map<string, ServerDataModel>,
  anonymousModelNames: Map<Model, string>,
): ServerOperationParameter {
  const location: ServerParameterLocation =
    param.type === "cookie" ? "header" : (param.type as ServerParameterLocation);
  return {
    name: param.param.name,
    wireName: param.name,
    location,
    type: toTypeRef(program, param.param.type, modelRegistry, anonymousModelNames),
    optional: param.param.optional,
  };
}

function buildRequestBody(
  program: Program,
  body: HttpPayloadBody,
  modelRegistry: Map<string, ServerDataModel>,
  anonymousModelNames: Map<Model, string>,
): ServerRequestBody {
  return {
    type: toTypeRef(program, body.type, modelRegistry, anonymousModelNames),
    contentTypes: body.contentTypes,
  };
}

function buildResponse(
  program: Program,
  response: HttpOperationResponse,
  modelRegistry: Map<string, ServerDataModel>,
  anonymousModelNames: Map<Model, string>,
): ServerResponse {
  const content = response.responses[0];
  const headers: ServerResponseHeader[] = [];
  for (const [headerWireName, prop] of Object.entries(content?.headers ?? {})) {
    headers.push({
      name: prop.name,
      wireName: headerWireName,
      type: toTypeRef(program, prop.type, modelRegistry, anonymousModelNames),
      optional: prop.optional,
    });
  }

  return {
    statusCode: typeof response.statusCodes === "number" ? response.statusCodes : "*",
    headers,
    body: content?.body
      ? buildRequestBody(program, content.body, modelRegistry, anonymousModelNames)
      : undefined,
  };
}

/**
 * Converts a TypeSpec {@link Type} into a {@link ServerTypeRef}, registering any named model
 * into `modelRegistry` (recursively) the first time it is seen.
 */
function toTypeRef(
  program: Program,
  type: Type,
  modelRegistry: Map<string, ServerDataModel>,
  anonymousModelNames: Map<Model, string>,
): ServerTypeRef {
  switch (type.kind) {
    case "Scalar":
      if (isNumericLikeScalar(type)) return { kind: "number" };
      if (isStringLikeScalar(type)) return { kind: "string" };
      if (type.name === "boolean") return { kind: "boolean" };
      return { kind: "unknown" };
    case "Boolean":
      return { kind: "literal", value: type.value };
    case "String":
      return { kind: "literal", value: type.value };
    case "Number":
      return { kind: "literal", value: type.numericValue.asNumber() ?? 0 };
    case "Enum": {
      // Pilot simplification: enums are rendered as `string` in generated TypeScript.
      // A follow-up could render them as proper TS string-literal unions.
      return { kind: "string" };
    }
    case "Model": {
      if (isArrayModelType(type)) {
        return {
          kind: "array",
          element: toTypeRef(program, type.indexer.value, modelRegistry, anonymousModelNames),
        };
      }
      // `Record<T>` (e.g. the queue/blob `metadata: Record<string>` dictionary pattern) is a
      // built-in indexer type, not a model with its own declared properties — found while
      // running this against the real Storage Queue spec's `QueueItem.metadata` property, which
      // this pilot originally mis-rendered as an empty `Record` interface (see README).
      if (isRecordModelType(program, type)) {
        return {
          kind: "record",
          element: toTypeRef(program, type.indexer.value, modelRegistry, anonymousModelNames),
        };
      }
      return registerModel(program, type, modelRegistry, anonymousModelNames);
    }
    case "Union": {
      // Pilot simplification: unions collapse to `unknown`.
      return { kind: "unknown" };
    }
    default:
      return { kind: "unknown" };
  }
}

function registerModel(
  program: Program,
  model: Model,
  modelRegistry: Map<string, ServerDataModel>,
  anonymousModelNames: Map<Model, string>,
): ServerTypeRef {
  const name = resolveModelName(model, modelRegistry, anonymousModelNames);
  if (!modelRegistry.has(name)) {
    // Insert a placeholder first to guard against infinite recursion on cyclic models.
    modelRegistry.set(name, { name, properties: [] });
    const properties = [...model.properties.values()].map((prop) =>
      buildModelProperty(program, prop, modelRegistry, anonymousModelNames),
    );
    modelRegistry.set(name, { name, properties, doc: getDocHelper(program, model) });
  }
  return { kind: "model", name };
}

/**
 * Resolves the generated TS type name for `model`. Named models use their TypeSpec name
 * directly; anonymous models (`model.name === ""`) get a stable, unique `AnonymousModelN` name
 * keyed by *object identity* so that two structurally-different anonymous models never clobber
 * each other under the same cache key (see {@link buildServerModel}'s `anonymousModelNames` doc
 * comment).
 */
function resolveModelName(
  model: Model,
  modelRegistry: Map<string, ServerDataModel>,
  anonymousModelNames: Map<Model, string>,
): string {
  if (model.name) return model.name;
  const existing = anonymousModelNames.get(model);
  if (existing) return existing;
  let candidate =
    modelRegistry.size === 0 ? "AnonymousModel" : `AnonymousModel${modelRegistry.size}`;
  while (modelRegistry.has(candidate)) {
    candidate = `AnonymousModel${modelRegistry.size}_${anonymousModelNames.size}`;
  }
  anonymousModelNames.set(model, candidate);
  return candidate;
}

function buildModelProperty(
  program: Program,
  prop: ModelProperty,
  modelRegistry: Map<string, ServerDataModel>,
  anonymousModelNames: Map<Model, string>,
): ServerModelProperty {
  return {
    name: prop.name,
    type: toTypeRef(program, prop.type, modelRegistry, anonymousModelNames),
    optional: prop.optional,
    doc: getDocHelper(program, prop),
  };
}

function getDocHelper(program: Program, target: Type): string | undefined {
  return getDoc(program, target);
}
