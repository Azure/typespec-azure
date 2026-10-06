import { type Model, type ModelProperty, type Program, type Type } from "@typespec/compiler";
import { $ } from "@typespec/compiler/typekit";
import {
  getAllHttpServices,
  type HttpOperation,
  type HttpOperationParameter,
  type HttpOperationResponse,
  type HttpPayloadBody,
} from "@typespec/http";
import type {
  ServerDataModel,
  ServerLiteralQueryParameter,
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
import { getName, getPascalName } from "./utils.js";

/**
 * Builds the intermediate {@link ServerModel} for the (single) HTTP service found in the
 * compiled program. This is the "transform" phase: it walks `@typespec/http` metadata and
 * TypeSpec model types and produces a simplified, render-ready representation.
 *
 * Operations the transform phase can't represent are skipped with a reason in
 * `skippedOperations`.
 */
export function buildServerModel(program: Program): ServerModel {
  const [services] = getAllHttpServices(program);
  const service = services[0];
  const modelRegistry = new Map<string, ServerDataModel>();
  const anonymousModelNames = new Map<Model, string>();

  const operations: ServerOperation[] = [];
  const skippedOperations: ServerSkippedOperation[] = [];
  const usedOperationNames = new Set<string>();
  for (const op of service?.operations ?? []) {
    try {
      const operationName = getOperationName(program, op, usedOperationNames);
      const built = buildOperation(program, operationName, op, modelRegistry, anonymousModelNames);
      usedOperationNames.add(operationName);
      operations.push(built);
    } catch (error) {
      skippedOperations.push({
        name: getPascalName(op.operation.name),
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    serviceName: service ? getName(program, service.namespace, service.namespace.name) : "Service",
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
  name: string,
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
  const route = splitRoutePath(op.path);

  return {
    name,
    verb: op.verb,
    rawPath: op.path,
    path: route.path,
    literalQueryParameters: route.literalQueryParameters,
    parameters,
    requestBody,
    responses,
    doc: getDocHelper(program, op.operation),
    interfaceName: op.operation.interface?.name,
  };
}

function getOperationName(
  program: Program,
  op: HttpOperation,
  usedOperationNames: ReadonlySet<string>,
): string {
  const baseName = getName(program, op.operation, getPascalName(op.operation.name));
  const qualifiedName =
    usedOperationNames.has(baseName) && op.operation.interface?.name
      ? `${getPascalName(op.operation.interface.name)}${baseName}`
      : baseName;
  return disambiguate(qualifiedName, usedOperationNames);
}

function splitRoutePath(path: string): {
  path: string;
  literalQueryParameters: ServerLiteralQueryParameter[];
} {
  const queryStart = path.indexOf("?");
  if (queryStart === -1) {
    return { path, literalQueryParameters: [] };
  }

  const routePath = path.slice(0, queryStart);
  const query = path.slice(queryStart + 1);
  const literalQueryParameters = query
    .split("&")
    .filter(Boolean)
    .map((part) => {
      const [rawName, rawValue = ""] = part.split("=");
      return {
        name: decodeURIComponent(rawName),
        value: decodeURIComponent(rawValue),
      };
    });

  return { path: routePath, literalQueryParameters };
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
    name: getName(program, param.param, param.param.name),
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
      name: getName(program, prop, prop.name),
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
  const tk = $(program);
  switch (type.kind) {
    case "Scalar":
      if (tk.scalar.extendsNumeric(type)) return { kind: "number" };
      if (tk.scalar.extendsString(type)) return { kind: "string" };
      if (
        tk.scalar.extendsUtcDateTime(type) ||
        tk.scalar.extendsOffsetDateTime(type) ||
        tk.scalar.extendsPlainDate(type) ||
        tk.scalar.extendsPlainTime(type)
      ) {
        return { kind: "datetime" };
      }
      if (tk.scalar.extendsBoolean(type)) return { kind: "boolean" };
      return { kind: "unknown" };
    case "Boolean":
      return { kind: "literal", value: type.value };
    case "String":
      return { kind: "literal", value: type.value };
    case "Number":
      return { kind: "literal", value: type.numericValue.asNumber() ?? 0 };
    case "Enum": {
      return { kind: "string" };
    }
    case "Model": {
      if (tk.array.is(type)) {
        return {
          kind: "array",
          element: toTypeRef(
            program,
            tk.array.getElementType(type),
            modelRegistry,
            anonymousModelNames,
          ),
        };
      }
      if (tk.record.is(type)) {
        return {
          kind: "record",
          element: toTypeRef(
            program,
            tk.record.getElementType(type),
            modelRegistry,
            anonymousModelNames,
          ),
        };
      }
      return registerModel(program, type, modelRegistry, anonymousModelNames);
    }
    case "Union": {
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
  const tk = $(program);
  const name = resolveModelName(program, model, modelRegistry, anonymousModelNames);
  if (!modelRegistry.has(name)) {
    // Insert a placeholder first to guard against infinite recursion on cyclic models.
    modelRegistry.set(name, { name, properties: [] });
    const properties = [...tk.model.getProperties(model).values()].map((prop) =>
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
  program: Program,
  model: Model,
  modelRegistry: Map<string, ServerDataModel>,
  anonymousModelNames: Map<Model, string>,
): string {
  if (model.name) return getName(program, model, model.name);
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
    name: getName(program, prop, prop.name),
    wireName: $(program).type.getEncodedName(prop, "application/xml"),
    type: toTypeRef(program, prop.type, modelRegistry, anonymousModelNames),
    optional: prop.optional,
    doc: getDocHelper(program, prop),
  };
}

function getDocHelper(program: Program, target: Type): string | undefined {
  return $(program).type.getDoc(target);
}
