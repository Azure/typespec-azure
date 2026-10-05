import {
  getDoc,
  isArrayModelType,
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
 */
export function buildServerModel(program: Program): ServerModel {
  const [services] = getAllHttpServices(program);
  const service = services[0];
  const modelRegistry = new Map<string, ServerDataModel>();

  const operations = (service?.operations ?? []).map((op) =>
    buildOperation(program, op, modelRegistry),
  );

  return {
    serviceName: service?.namespace.name ?? "Service",
    operations,
    models: [...modelRegistry.values()],
  };
}

function buildOperation(
  program: Program,
  op: HttpOperation,
  modelRegistry: Map<string, ServerDataModel>,
): ServerOperation {
  const parameters = op.parameters.parameters.map((p) => buildParameter(program, p, modelRegistry));

  const requestBody = op.parameters.body
    ? buildRequestBody(program, op.parameters.body, modelRegistry)
    : undefined;

  const responses = op.responses.map((r) => buildResponse(program, r, modelRegistry));

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
): ServerOperationParameter {
  const location: ServerParameterLocation =
    param.type === "cookie" ? "header" : (param.type as ServerParameterLocation);
  return {
    name: param.param.name,
    wireName: param.name,
    location,
    type: toTypeRef(program, param.param.type, modelRegistry),
    optional: param.param.optional,
  };
}

function buildRequestBody(
  program: Program,
  body: HttpPayloadBody,
  modelRegistry: Map<string, ServerDataModel>,
): ServerRequestBody {
  return {
    type: toTypeRef(program, body.type, modelRegistry),
    contentTypes: body.contentTypes,
  };
}

function buildResponse(
  program: Program,
  response: HttpOperationResponse,
  modelRegistry: Map<string, ServerDataModel>,
): ServerResponse {
  const content = response.responses[0];
  const headers: ServerResponseHeader[] = [];
  for (const [headerWireName, prop] of Object.entries(content?.headers ?? {})) {
    headers.push({
      name: prop.name,
      wireName: headerWireName,
      type: toTypeRef(program, prop.type, modelRegistry),
      optional: prop.optional,
    });
  }

  return {
    statusCode: typeof response.statusCodes === "number" ? response.statusCodes : "*",
    headers,
    body: content?.body ? buildRequestBody(program, content.body, modelRegistry) : undefined,
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
        return { kind: "array", element: toTypeRef(program, type.indexer.value, modelRegistry) };
      }
      return registerModel(program, type, modelRegistry);
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
): ServerTypeRef {
  const name = model.name || "AnonymousModel";
  if (!modelRegistry.has(name)) {
    // Insert a placeholder first to guard against infinite recursion on cyclic models.
    modelRegistry.set(name, { name, properties: [] });
    const properties = [...model.properties.values()].map((prop) =>
      buildModelProperty(program, prop, modelRegistry),
    );
    modelRegistry.set(name, { name, properties, doc: getDocHelper(program, model) });
  }
  return { kind: "model", name };
}

function buildModelProperty(
  program: Program,
  prop: ModelProperty,
  modelRegistry: Map<string, ServerDataModel>,
): ServerModelProperty {
  return {
    name: prop.name,
    type: toTypeRef(program, prop.type, modelRegistry),
    optional: prop.optional,
    doc: getDocHelper(program, prop),
  };
}

function getDocHelper(program: Program, target: Type): string | undefined {
  return getDoc(program, target);
}
