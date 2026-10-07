import {
  $doc,
  type DecoratorContext,
  type Model,
  type ModelProperty,
  type Program,
  type Type,
} from "@typespec/compiler";
import { $ } from "@typespec/compiler/typekit";
import {
  getAllHttpServices,
  type HttpOperation,
  type HttpOperationParameter,
  type HttpOperationResponse,
  type HttpPayloadBody,
} from "@typespec/http";
import "@typespec/http/experimental/typekit";
import { isAttribute, isUnwrapped } from "@typespec/xml";
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

interface TypeMetadata {
  readonly runtime: ServerTypeRef;
  readonly declaration: Type;
}

type BuiltOperationParameter = ServerOperationParameter & { readonly declarationType: Type };
type BuiltRequestBody = ServerRequestBody & { readonly declarationType: Type };
type BuiltResponseHeader = ServerResponseHeader & { readonly declarationType: Type };
type BuiltResponse = Omit<ServerResponse, "headers" | "body"> & {
  readonly headers: BuiltResponseHeader[];
  readonly body?: BuiltRequestBody;
};

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
  const doc = getDocHelper(program, op.operation);
  const operation: ServerOperation = {
    name,
    verb: op.verb,
    rawPath: op.path,
    path: route.path,
    literalQueryParameters: route.literalQueryParameters,
    parameters: parameters.map(stripParameter),
    parametersModel: createOperationParametersModel(program, name, parameters, requestBody, doc),
    requestBody: requestBody && stripRequestBody(requestBody),
    responses: responses.map(stripResponse),
    responseUnion: createOperationResponseUnion(program, name, responses),
    doc,
    interfaceName: op.operation.interface?.name,
  };

  return operation;
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
): BuiltOperationParameter {
  const location: ServerParameterLocation =
    param.type === "cookie" ? "header" : (param.type as ServerParameterLocation);
  const type = getTypeMetadata(program, param.param.type, modelRegistry, anonymousModelNames);
  return {
    name: getName(program, param.param, param.param.name),
    wireName: param.name,
    location,
    type: type.runtime,
    declarationType: type.declaration,
    optional: param.param.optional,
  };
}

function buildRequestBody(
  program: Program,
  body: HttpPayloadBody,
  modelRegistry: Map<string, ServerDataModel>,
  anonymousModelNames: Map<Model, string>,
): BuiltRequestBody {
  const type = getTypeMetadata(program, body.type, modelRegistry, anonymousModelNames);
  return {
    type: type.runtime,
    declarationType: type.declaration,
    contentTypes: body.contentTypes,
    parameterPath: getBodyParameterPath(program, body),
  };
}

function getBodyParameterPath(program: Program, body: HttpPayloadBody): string | readonly string[] {
  const property = "property" in body ? body.property : undefined;
  if (!property) return "body";
  const name = getHandlerBodyParameterName(getName(program, property, property.name));
  if (name === "queueMessage") return name;
  return property.optional ? ["options", name] : name;
}

function getHandlerBodyParameterName(name: string): string {
  return name === "queueServiceProperties" ? "storageServiceProperties" : name;
}

function buildResponse(
  program: Program,
  response: HttpOperationResponse,
  modelRegistry: Map<string, ServerDataModel>,
  anonymousModelNames: Map<Model, string>,
): BuiltResponse {
  const content = response.responses[0];
  const headers: BuiltResponseHeader[] = [];
  for (const [headerWireName, prop] of Object.entries(content?.headers ?? {})) {
    const type = getTypeMetadata(program, prop.type, modelRegistry, anonymousModelNames);
    headers.push({
      name: getName(program, prop, prop.name),
      wireName: headerWireName,
      type: type.runtime,
      declarationType: type.declaration,
      optional: prop.optional,
    });
  }

  return {
    statusCode: typeof response.statusCodes === "number" ? response.statusCodes : "*",
    headers,
    body:
      content?.body && response.statusCodes !== "*"
        ? buildRequestBody(program, content.body, modelRegistry, anonymousModelNames)
        : undefined,
  };
}

function stripParameter(parameter: BuiltOperationParameter): ServerOperationParameter {
  const { declarationType, ...serverParameter } = parameter;
  return serverParameter;
}

function stripRequestBody(body: BuiltRequestBody): ServerRequestBody {
  const { declarationType, ...serverBody } = body;
  return serverBody;
}

function stripResponse(response: BuiltResponse): ServerResponse {
  return {
    ...response,
    headers: response.headers.map(stripResponseHeader),
    body: response.body && stripRequestBody(response.body),
  };
}

function stripResponseHeader(header: BuiltResponseHeader): ServerResponseHeader {
  const { declarationType, ...serverHeader } = header;
  return serverHeader;
}

function getTypeMetadata(
  program: Program,
  type: Type,
  modelRegistry: Map<string, ServerDataModel>,
  anonymousModelNames: Map<Model, string>,
): TypeMetadata {
  const tk = $(program);
  switch (type.kind) {
    case "Scalar":
      if (tk.scalar.extendsNumeric(type)) return { runtime: { kind: "number" }, declaration: type };
      if (tk.scalar.extendsString(type)) return { runtime: { kind: "string" }, declaration: type };
      if (
        tk.scalar.extendsUtcDateTime(type) ||
        tk.scalar.extendsOffsetDateTime(type) ||
        tk.scalar.extendsPlainDate(type) ||
        tk.scalar.extendsPlainTime(type)
      ) {
        return { runtime: { kind: "datetime" }, declaration: tk.builtin.string };
      }
      if (tk.scalar.extendsBoolean(type))
        return { runtime: { kind: "boolean" }, declaration: type };
      return { runtime: { kind: "unknown" }, declaration: type };
    case "Boolean":
      return { runtime: { kind: "literal", value: type.value }, declaration: type };
    case "String":
      return { runtime: { kind: "literal", value: type.value }, declaration: type };
    case "Number":
      return {
        runtime: { kind: "literal", value: type.numericValue.asNumber() ?? 0 },
        declaration: type,
      };
    case "Enum": {
      return { runtime: { kind: "string" }, declaration: tk.builtin.string };
    }
    case "Model": {
      if (tk.array.is(type)) {
        const element = getTypeMetadata(
          program,
          tk.array.getElementType(type),
          modelRegistry,
          anonymousModelNames,
        );
        return {
          runtime: { kind: "array", element: element.runtime },
          declaration: tk.array.create(element.declaration),
        };
      }
      if (tk.record.is(type)) {
        const element = getTypeMetadata(
          program,
          tk.record.getElementType(type),
          modelRegistry,
          anonymousModelNames,
        );
        return {
          runtime: { kind: "record", element: element.runtime },
          declaration: tk.record.create(element.declaration),
        };
      }
      const runtime = registerModel(program, type, modelRegistry, anonymousModelNames);
      return {
        runtime,
        declaration:
          runtime.kind === "model" ? modelRegistry.get(runtime.name)!.declarationModel : type,
      };
    }
    case "Union": {
      return { runtime: { kind: "unknown" }, declaration: tk.intrinsic.any };
    }
    default:
      return { runtime: { kind: "unknown" }, declaration: type };
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
    const declarationModel = createDeclarationModel(program, name, model);
    // Insert a placeholder first to guard against infinite recursion on cyclic models.
    modelRegistry.set(name, { name, wireName: name, properties: [], declarationModel });
    const properties = [...tk.model.getProperties(model).values()].map((prop) =>
      buildModelProperty(program, prop, declarationModel, modelRegistry, anonymousModelNames),
    );
    modelRegistry.set(name, {
      name,
      wireName: $(program).type.getEncodedName(model, "application/xml"),
      properties,
      declarationModel,
      doc: getDocHelper(program, model),
    });
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
  const existingNamedModel = findStructurallyEquivalentNamedModel(
    program,
    model,
    modelRegistry,
    anonymousModelNames,
  );
  if (existingNamedModel) return existingNamedModel;
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

function findStructurallyEquivalentNamedModel(
  program: Program,
  model: Model,
  modelRegistry: Map<string, ServerDataModel>,
  anonymousModelNames: Map<Model, string>,
): string | undefined {
  const tk = $(program);
  const anonymousProperties = [...tk.model.getProperties(model).values()];
  for (const candidate of modelRegistry.values()) {
    if (candidate.name.startsWith("AnonymousModel")) continue;
    if (candidate.properties.length !== anonymousProperties.length) continue;
    const candidateProperties = new Map(candidate.properties.map((prop) => [prop.name, prop]));
    let matches = true;
    for (const prop of anonymousProperties) {
      const name = getName(program, prop, prop.name);
      const candidateProp = candidateProperties.get(name);
      if (
        candidateProp === undefined ||
        candidateProp.optional !== prop.optional ||
        candidateProp.wireName !== $(program).type.getEncodedName(prop, "application/xml")
      ) {
        matches = false;
        break;
      }
      const typeRef = getTypeMetadata(
        program,
        prop.type,
        modelRegistry,
        anonymousModelNames,
      ).runtime;
      if (JSON.stringify(candidateProp.type) !== JSON.stringify(typeRef)) {
        matches = false;
        break;
      }
    }
    if (matches) return candidate.name;
  }
  return undefined;
}

function buildModelProperty(
  program: Program,
  prop: ModelProperty,
  declarationModel: Model,
  modelRegistry: Map<string, ServerDataModel>,
  anonymousModelNames: Map<Model, string>,
): ServerModelProperty {
  const type = getTypeMetadata(program, prop.type, modelRegistry, anonymousModelNames);
  createDeclarationProperty(program, prop, declarationModel, type);
  return {
    name: getName(program, prop, prop.name),
    wireName: $(program).type.getEncodedName(prop, "application/xml"),
    type: type.runtime,
    optional: prop.optional,
    xmlAttribute: isAttribute(program, prop),
    xmlUnwrapped: isUnwrapped(program, prop),
    doc: getDocHelper(program, prop),
  };
}

function createDeclarationModel(program: Program, name: string, sourceModel: Model): Model {
  const tk = $(program);
  const model = tk.model.create({
    name,
    properties: {},
    expression: false,
  });
  applyDoc(program, model, getDocHelper(program, sourceModel));
  return model;
}

function createDeclarationProperty(
  program: Program,
  source: ModelProperty,
  declarationModel: Model,
  type: TypeMetadata,
): ModelProperty {
  const tk = $(program);
  const property = tk.modelProperty.create({
    name: getName(program, source, source.name),
    type: type.declaration,
    optional: source.optional,
    defaultValue: source.defaultValue,
  });
  property.model = declarationModel;
  declarationModel.properties.set(property.name, property);
  applyDoc(program, property, getDocHelper(program, source));
  return property;
}

function createOperationParametersModel(
  program: Program,
  operationName: string,
  parameters: readonly BuiltOperationParameter[],
  requestBody: BuiltRequestBody | undefined,
  doc: string | undefined,
): Model {
  const tk = $(program);
  const model = tk.model.create({
    name: `${operationName}Parameters`,
    properties: {},
    expression: false,
  });
  applyDoc(program, model, doc);

  for (const parameter of parameters) {
    const property = tk.modelProperty.create({
      name: parameter.name,
      type: parameter.declarationType,
      optional: parameter.optional,
    });
    property.model = model;
    model.properties.set(property.name, property);
  }

  if (requestBody !== undefined) {
    const property = tk.modelProperty.create({
      name: "body",
      type: requestBody.declarationType,
      optional: false,
    });
    property.model = model;
    model.properties.set(property.name, property);
  }

  return model;
}

function createOperationResponseUnion(
  program: Program,
  operationName: string,
  responses: readonly BuiltResponse[],
) {
  const tk = $(program);
  return tk.union.create({
    name: `${operationName}Response`,
    expression: false,
    variants: responses.map((response, index) =>
      tk.unionVariant.create({
        name: `response${index}`,
        type: createOperationResponseModel(program, response),
      }),
    ),
  });
}

function createOperationResponseModel(program: Program, response: BuiltResponse): Model {
  const tk = $(program);
  const model = tk.model.create({
    properties: {},
    expression: true,
  });

  const statusCodeProperty = tk.modelProperty.create({
    name: "statusCode",
    type:
      response.statusCode === "*"
        ? tk.builtin.float64
        : tk.literal.createNumeric(response.statusCode),
    optional: false,
  });
  statusCodeProperty.model = model;
  model.properties.set(statusCodeProperty.name, statusCodeProperty);

  if (response.headers.length > 0) {
    const headersProperty = tk.modelProperty.create({
      name: "headers",
      type: createResponseHeadersModel(program, response.headers),
      optional: false,
    });
    headersProperty.model = model;
    model.properties.set(headersProperty.name, headersProperty);
  }

  if (response.body !== undefined) {
    const bodyProperty = tk.modelProperty.create({
      name: "body",
      type: response.body.declarationType,
      optional: false,
    });
    bodyProperty.model = model;
    model.properties.set(bodyProperty.name, bodyProperty);
  }

  return model;
}

function createResponseHeadersModel(
  program: Program,
  headers: readonly BuiltResponseHeader[],
): Model {
  const tk = $(program);
  const model = tk.model.create({
    properties: {},
    expression: true,
  });

  for (const header of headers) {
    const property = tk.modelProperty.create({
      name: header.name,
      type: header.declarationType,
      optional: header.optional,
    });
    property.model = model;
    model.properties.set(property.name, property);
  }

  return model;
}

function applyDoc(program: Program, target: Type, doc: string | undefined): void {
  if (!doc) return;
  // Typekit can read docs but does not expose a public setter; use the public @doc
  // decorator so emitter-framework typed declarations can infer copied docs.
  $doc({ program } as DecoratorContext, target, doc);
}

function getDocHelper(program: Program, target: Type): string | undefined {
  return $(program).type.getDoc(target);
}
