import * as ts from "@alloy-js/typescript";
import {
  $doc,
  type DiagnosticTarget,
  type Model,
  type ModelProperty,
  type Scalar,
  type Type,
} from "@typespec/compiler";
import {
  type HttpOperation,
  type HttpOperationParameter,
  type HttpOperationResponse,
  type HttpPayloadBody,
  type HttpService,
} from "@typespec/http";
import "@typespec/http/experimental/typekit";
import { isAttribute, isUnwrapped } from "@typespec/xml";
import type { AzuriteEmitterContext } from "./context.js";
import { isOptional } from "./decorators.js";
import { createDiagnostic } from "./lib.js";
import type {
  ServerDataModel,
  ServerLiteralQueryParameter,
  ServerModel,
  ServerModelProperty,
  ServerNumericConstraints,
  ServerOperation,
  ServerOperationParameter,
  ServerRequestBody,
  ServerResponse,
  ServerResponseHeader,
  ServerTypeRef,
} from "./model.js";
import { getName, hasNameOverride } from "./utils.js";

const tsNamePolicy = ts.createTSNamePolicy();

class UnsupportedTypeError extends Error {
  constructor(
    message: string,
    readonly target: DiagnosticTarget,
  ) {
    super(message);
  }
}

interface ModelBuilderContext extends AzuriteEmitterContext {
  modelRegistry: Map<string, ServerDataModel & { source: Model }>;
  anonymousModelNamesByType: WeakMap<Model, string>;
  nextAnonymousModelId: number;
}

function getTypeName(name: string): string {
  return tsNamePolicy.getName(name, "type");
}

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

interface OperationNamePlan {
  readonly runtimeName: string;
  readonly typeName: string;
}

interface OperationNameCandidate {
  readonly op: HttpOperation;
  readonly baseRuntimeName: string;
  readonly explicitRuntimeName: boolean;
}

/**
 * Builds the intermediate {@link ServerModel} for the (single) HTTP service found in the
 * compiled program. This is the "transform" phase: it walks `@typespec/http` metadata and
 * TypeSpec model types and produces a simplified, render-ready representation.
 *
 * Unsupported wire shapes produce a diagnostic rather than a partial model.
 */
export function buildServerModel(
  emitterContext: AzuriteEmitterContext,
  service: HttpService,
): ServerModel {
  const context: ModelBuilderContext = {
    ...emitterContext,
    modelRegistry: new Map(),
    anonymousModelNamesByType: new WeakMap(),
    nextAnonymousModelId: 1,
  };
  const serviceName = getName(context, service.namespace, service.namespace.name);
  const operations: ServerOperation[] = [];
  const operationNames = planOperationNames(context, service.operations);
  try {
    for (const op of service.operations) {
      const names = operationNames.get(op);
      if (names === undefined) continue;
      const built = buildOperation(context, names.runtimeName, names.typeName, op);
      operations.push(built);
    }
  } catch (error) {
    if (!(error instanceof UnsupportedTypeError)) throw error;
    context.diagnostics.push(
      createDiagnostic({
        code: "unsupported-type",
        format: { message: error.message },
        target: error.target,
      }),
    );
    return { serviceName, operations: [], models: [] };
  }

  return {
    serviceName,
    operations,
    models: [...context.modelRegistry.values()],
  };
}

function buildOperation(
  context: ModelBuilderContext,
  name: string,
  typeName: string,
  op: HttpOperation,
): ServerOperation {
  const parameters = op.parameters.parameters.map((p) => buildParameter(context, p));

  const requestBody = op.parameters.body
    ? buildRequestBody(context, op.parameters.body)
    : undefined;

  if (requestBody && parameters.some((p) => p.name === "body")) {
    throw new UnsupportedTypeError(
      "parameter 'body' conflicts with the request body",
      op.operation,
    );
  }

  const responses = op.responses.map((r) => buildResponse(context, r));
  const route = splitRoutePath(op.path);
  const doc = getDocHelper(context, op.operation);
  const operation: ServerOperation = {
    name,
    typeName,
    verb: op.verb,
    rawPath: op.path,
    path: route.path,
    literalQueryParameters: route.literalQueryParameters,
    parameters: parameters.map(stripParameter),
    parametersModel: createOperationParametersModel(
      context,
      typeName,
      parameters,
      requestBody,
      doc,
    ),
    requestBody: requestBody && stripRequestBody(requestBody),
    responses: responses.map(stripResponse),
    responseUnion: createOperationResponseUnion(context, typeName, responses),
    doc,
    interfaceName: op.operation.interface?.name,
  };

  return operation;
}

function planOperationNames(
  context: AzuriteEmitterContext,
  operations: readonly HttpOperation[],
): Map<HttpOperation, OperationNamePlan> {
  const candidates = operations.map((op) => ({
    op,
    baseRuntimeName: getName(context, op.operation, getTypeName(op.operation.name)),
    explicitRuntimeName: hasNameOverride(context, op.operation),
  }));
  const runtimeNames = resolveRuntimeOperationNames(context, candidates);
  const typeNames = resolveOperationTypeNames(context, runtimeNames);
  return new Map(
    [...runtimeNames.entries()]
      .filter(([op]) => typeNames.has(op))
      .map(([op, runtimeName]) => [op, { runtimeName, typeName: typeNames.get(op)! }]),
  );
}

function resolveRuntimeOperationNames(
  context: AzuriteEmitterContext,
  candidates: readonly OperationNameCandidate[],
): Map<HttpOperation, string> {
  const resolved = new Map<HttpOperation, string>();
  for (const group of groupBy(candidates, (candidate) => candidate.baseRuntimeName).values()) {
    if (group.length === 1) {
      resolved.set(group[0].op, group[0].baseRuntimeName);
      continue;
    }
    if (group.some((candidate) => candidate.explicitRuntimeName)) {
      reportNameCollision(
        context,
        group,
        group[0].baseRuntimeName,
        "duplicate explicit or effective runtime operation names are not qualified automatically",
      );
      continue;
    }
    const qualified = qualifyOperationNameGroup(context, group, group[0].baseRuntimeName);
    for (const [op, name] of qualified) resolved.set(op, name);
  }
  return resolved;
}

function resolveOperationTypeNames(
  context: AzuriteEmitterContext,
  runtimeNames: ReadonlyMap<HttpOperation, string>,
): Map<HttpOperation, string> {
  const planned = new Map<HttpOperation, string>();
  for (const group of groupBy([...runtimeNames.entries()], ([, name]) =>
    getTypeName(name),
  ).values()) {
    if (group.length === 1) {
      planned.set(group[0][0], getTypeName(group[0][1]));
      continue;
    }
    const candidates = group.map(([op, runtimeName]) => ({
      op,
      baseRuntimeName: getTypeName(runtimeName),
      explicitRuntimeName: false,
    }));
    const qualified = qualifyOperationNameGroup(context, candidates, getTypeName(group[0][1]));
    for (const [op, name] of qualified) planned.set(op, name);
  }
  return planned;
}

function qualifyOperationNameGroup(
  context: AzuriteEmitterContext,
  group: readonly OperationNameCandidate[],
  collidingName: string,
): Map<HttpOperation, string> {
  const qualified = new Map<HttpOperation, string>();
  for (const candidate of group) {
    const interfaceName = candidate.op.operation.interface?.name;
    if (!interfaceName) {
      reportNameCollision(
        context,
        [candidate],
        collidingName,
        "operation has no interface name available for deterministic qualification",
      );
      continue;
    }
    qualified.set(candidate.op, `${getTypeName(interfaceName)}${candidate.baseRuntimeName}`);
  }
  for (const duplicateGroup of groupBy([...qualified.entries()], ([, name]) => name).values()) {
    if (duplicateGroup.length <= 1) continue;
    reportNameCollision(
      context,
      duplicateGroup.map(([op]) => ({
        op,
        baseRuntimeName: duplicateGroup[0][1],
        explicitRuntimeName: false,
      })),
      duplicateGroup[0][1],
      "interface-qualified operation names still collide",
    );
    for (const [op] of duplicateGroup) qualified.delete(op);
  }
  return qualified;
}

function reportNameCollision(
  context: AzuriteEmitterContext,
  group: readonly OperationNameCandidate[],
  name: string,
  reason: string,
): void {
  for (const candidate of group) {
    context.diagnostics.push(
      createDiagnostic({
        code: "operation-name-collision",
        format: { name, reason },
        target: candidate.op.operation,
      }),
    );
  }
}

function groupBy<T, TKey>(items: Iterable<T>, keySelector: (item: T) => TKey): Map<TKey, T[]> {
  const groups = new Map<TKey, T[]>();
  for (const item of items) {
    const key = keySelector(item);
    const group = groups.get(key);
    if (group) {
      group.push(item);
    } else {
      groups.set(key, [item]);
    }
  }
  return groups;
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
  context: ModelBuilderContext,
  param: HttpOperationParameter,
): BuiltOperationParameter {
  if (param.type === "cookie") {
    throw new UnsupportedTypeError(
      `cookie parameter '${param.name}' is not supported`,
      param.param,
    );
  }
  const collectionPrefix = param.type === "header" ? getCollectionPrefix(param.name) : undefined;
  const type = collectionPrefix
    ? getHeaderCollectionTypeMetadata(context)
    : getTypeMetadata(context, param.param.type, param.param);
  return {
    name: getName(context, param.param, param.param.name),
    wireName: param.name,
    location: param.type,
    collectionPrefix,
    type: type.runtime,
    declarationType: type.declaration,
    optional: isOptional(context.program, param.param),
  };
}

function buildRequestBody(context: ModelBuilderContext, body: HttpPayloadBody): BuiltRequestBody {
  checkBodyKind(body);
  const type = getTypeMetadata(context, body.type, body.property ?? body.type);
  return {
    type: type.runtime,
    declarationType: type.declaration,
    contentTypes: body.contentTypes,
    parameterPath: "body",
  };
}

function checkBodyKind(body: HttpPayloadBody): void {
  if (body.bodyKind !== "single") {
    throw new UnsupportedTypeError(
      `${body.bodyKind} bodies are not supported`,
      body.property ?? body.type,
    );
  }
}

function buildResponse(
  context: ModelBuilderContext,
  response: HttpOperationResponse,
): BuiltResponse {
  const statusCode = response.statusCodes;
  if (typeof statusCode === "object") {
    const statusProperty = response.responses[0]?.properties.find((p) => p.kind === "statusCode");
    throw new UnsupportedTypeError(
      `response status range ${statusCode.start}-${statusCode.end} is not supported`,
      statusProperty?.property ?? response.type,
    );
  }
  if (response.responses.length > 1) {
    throw new UnsupportedTypeError(
      `multiple response variants for status ${statusCode} are not supported`,
      response.type,
    );
  }
  const [content] = response.responses;
  const body = content?.body;
  // Default bodies bypass buildRequestBody because Queue error middleware serializes them.
  if (body && statusCode === "*") checkBodyKind(body);
  if (body && body.contentTypes.length > 1) {
    throw new UnsupportedTypeError(
      `multiple response content types for status ${statusCode} are not supported: ${body.contentTypes.join(", ")}`,
      body.contentTypeProperty ?? response.type,
    );
  }
  const headers: BuiltResponseHeader[] = [];
  for (const [headerWireName, prop] of Object.entries(content?.headers ?? {})) {
    const collectionPrefix = getCollectionPrefix(headerWireName);
    const type = collectionPrefix
      ? getHeaderCollectionTypeMetadata(context)
      : getTypeMetadata(context, prop.type, prop);
    headers.push({
      name: getName(context, prop, prop.name),
      wireName: headerWireName,
      collectionPrefix,
      type: type.runtime,
      declarationType: type.declaration,
      optional: isOptional(context.program, prop),
    });
  }
  return {
    statusCode,
    headers,
    body: body && statusCode !== "*" ? buildRequestBody(context, body) : undefined,
  };
}

function getCollectionPrefix(wireName: string): string | undefined {
  return wireName.toLowerCase() === "x-ms-meta" ? "x-ms-meta-" : undefined;
}

function getHeaderCollectionTypeMetadata(context: AzuriteEmitterContext): TypeMetadata {
  const tk = context.tk;
  const value = tk.union.create([tk.builtin.string, tk.array.create(tk.builtin.string)]);
  return {
    runtime: {
      kind: "record",
      element: {
        kind: "union",
        variants: [{ kind: "string" }, { kind: "array", element: { kind: "string" } }],
      },
    },
    declaration: tk.record.create(value),
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
  context: ModelBuilderContext,
  type: Type,
  constraintTarget: Type = type,
  wireProperty = constraintTarget.kind === "ModelProperty" ? constraintTarget : undefined,
): TypeMetadata {
  const tk = context.tk;
  switch (type.kind) {
    case "Scalar": {
      const scalarName = type.name || "<anonymous>";
      if (tk.scalar.extendsUtcDateTime(type) || tk.scalar.extendsOffsetDateTime(type)) {
        let encoding = wireProperty
          ? tk.modelProperty.getEncoding(wireProperty)?.encoding
          : undefined;
        // getEncoding does not walk base scalars.
        for (
          let scalar: Scalar | undefined = type;
          encoding === undefined && scalar;
          scalar = scalar.baseScalar
        ) {
          encoding = tk.scalar.getEncoding(scalar)?.encoding;
        }
        encoding ??=
          wireProperty && tk.modelProperty.isHttpHeader(wireProperty) ? "rfc7231" : "rfc3339";
        if (
          encoding !== "rfc3339" &&
          encoding !== "rfc3339-fixed-width" &&
          encoding !== "rfc7231" &&
          encoding !== "unixTimestamp"
        ) {
          throw new UnsupportedTypeError(
            `unsupported datetime encoding ${encoding}`,
            wireProperty ?? type,
          );
        }
        return {
          runtime: { kind: "datetime", encoding },
          declaration: encoding === "unixTimestamp" ? tk.builtin.safeInt : tk.builtin.string,
        };
      }
      if (tk.scalar.extendsPlainDate(type)) {
        return { runtime: { kind: "datetime", encoding: "date" }, declaration: tk.builtin.string };
      }
      if (tk.scalar.extendsPlainTime(type)) {
        return { runtime: { kind: "datetime", encoding: "time" }, declaration: tk.builtin.string };
      }
      if (tk.scalar.extendsNumeric(type))
        return {
          runtime: numericTypeRef(context, constraintTarget),
          declaration: type,
        };
      if (tk.scalar.extendsString(type)) return { runtime: { kind: "string" }, declaration: type };
      if (tk.scalar.extendsBoolean(type))
        return { runtime: { kind: "boolean" }, declaration: type };
      throw new UnsupportedTypeError(`unsupported scalar ${scalarName}`, constraintTarget);
    }
    case "Boolean":
    case "String":
      return { runtime: { kind: "literal", value: type.value }, declaration: type };
    case "Number": {
      let value: number | null | undefined;
      try {
        value = type.numericValue.asNumber();
      } catch {
        value = undefined;
      }
      if (value === undefined || value === null || !Number.isFinite(value)) {
        throw new UnsupportedTypeError(
          "numeric literal cannot be represented as a JavaScript number",
          constraintTarget,
        );
      }
      return {
        runtime: { kind: "literal", value },
        declaration: type,
      };
    }
    case "EnumMember": {
      const value = type.value ?? type.name;
      if (typeof value !== "string") {
        throw new UnsupportedTypeError(
          `unsupported numeric enum member ${type.enum.name}.${type.name}`,
          type,
        );
      }
      return { runtime: { kind: "literal", value }, declaration: tk.literal.createString(value) };
    }
    case "Enum":
    case "Union": {
      const members =
        type.kind === "Enum"
          ? [...type.members.values()]
          : [...type.variants.values()].map((v) => v.type);
      if (members.length === 0) {
        throw new UnsupportedTypeError(`unsupported empty ${type.kind.toLowerCase()}`, type);
      }
      const variants = members.map((member) =>
        getTypeMetadata(context, member, member, wireProperty),
      );
      return {
        runtime: { kind: "union", variants: variants.map((v) => v.runtime) },
        declaration: tk.union.create(variants.map((v) => v.declaration)),
      };
    }
    case "Model": {
      if (tk.array.is(type)) {
        const element = getTypeMetadata(
          context,
          tk.array.getElementType(type),
          undefined,
          wireProperty,
        );
        return {
          runtime: { kind: "array", element: element.runtime },
          declaration: tk.array.create(element.declaration),
        };
      }
      if (tk.record.is(type)) {
        const element = getTypeMetadata(context, tk.record.getElementType(type));
        return {
          runtime: { kind: "record", element: element.runtime },
          declaration: tk.record.create(element.declaration),
        };
      }
      const runtime = registerModel(context, type);
      return {
        runtime,
        declaration:
          runtime.kind === "model"
            ? context.modelRegistry.get(runtime.name)!.declarationModel
            : type,
      };
    }
    case "Intrinsic": {
      if (type.name === "null") {
        return { runtime: { kind: "literal", value: null }, declaration: type };
      }
      throw new UnsupportedTypeError(`unsupported intrinsic ${type.name}`, constraintTarget);
    }
    default:
      throw new UnsupportedTypeError(
        `unsupported TypeSpec type kind ${type.kind}`,
        constraintTarget,
      );
  }
}

function registerModel(context: ModelBuilderContext, model: Model): ServerTypeRef {
  const tk = context.tk;
  const name = resolveModelName(context, model);
  const existing = context.modelRegistry.get(name);
  if (existing && existing.source !== model) {
    throw new UnsupportedTypeError(`distinct models share the generated name '${name}'`, model);
  }
  if (!existing) {
    const declarationModel = createDeclarationModel(context, name, model);
    const properties: ServerDataModel["properties"] = [];
    // Register the identity before walking properties so recursive references resolve.
    context.modelRegistry.set(name, {
      source: model,
      name,
      wireName: context.tk.type.getEncodedName(model, "application/xml"),
      properties,
      declarationModel,
      doc: getDocHelper(context, model),
    });
    for (const prop of tk.model.getProperties(model).values()) {
      properties.push(buildModelProperty(context, prop, declarationModel));
    }
  }
  return { kind: "model", name };
}

/**
 * Resolves the generated TS type name for `model`. Named models use their TypeSpec name
 * directly; anonymous models (`model.name === ""`) get a stable, unique `AnonymousModelN` name
 * keyed by *object identity* so that two structurally-different anonymous models never clobber
 * each other under the same cache key.
 */
function resolveModelName(context: ModelBuilderContext, model: Model): string {
  if (model.name) return getTypeName(getName(context, model, model.name));
  // Anonymous TypeSpec models all have an empty name, so identity is the only stable cache key.
  const existing = context.anonymousModelNamesByType.get(model);
  if (existing) return existing;
  let candidate = anonymousModelName(context.nextAnonymousModelId++);
  while (context.modelRegistry.has(candidate)) {
    candidate = anonymousModelName(context.nextAnonymousModelId++);
  }
  context.anonymousModelNamesByType.set(model, candidate);
  return candidate;
}

function anonymousModelName(id: number): string {
  return id === 1 ? "AnonymousModel" : `AnonymousModel${id}`;
}

function buildModelProperty(
  context: ModelBuilderContext,
  prop: ModelProperty,
  declarationModel: Model,
): ServerModelProperty {
  const type = getTypeMetadata(context, prop.type, prop);
  createDeclarationProperty(context, prop, declarationModel, type);
  return {
    name: getName(context, prop, prop.name),
    wireName: context.tk.type.getEncodedName(prop, "application/xml"),
    type: type.runtime,
    optional: isOptional(context.program, prop),
    xmlAttribute: isAttribute(context.program, prop),
    xmlUnwrapped: isUnwrapped(context.program, prop),
    doc: getDocHelper(context, prop),
  };
}

function createDeclarationModel(
  context: AzuriteEmitterContext,
  name: string,
  sourceModel: Model,
): Model {
  const tk = context.tk;
  const doc = getDocHelper(context, sourceModel);
  return tk.model.create({
    name,
    properties: {},
    expression: false,
    decorators: doc ? [[$doc, doc]] : [],
  });
}

function createDeclarationProperty(
  context: AzuriteEmitterContext,
  source: ModelProperty,
  declarationModel: Model,
  type: TypeMetadata,
): ModelProperty {
  const tk = context.tk;
  const property = tk.modelProperty.create({
    name: getName(context, source, source.name),
    type: type.declaration,
    optional: isOptional(context.program, source),
    defaultValue: source.defaultValue,
  });
  property.model = declarationModel;
  declarationModel.properties.set(property.name, property);
  const doc = getDocHelper(context, source);
  if (doc) {
    property.decorators.push({
      decorator: $doc,
      args: [{ value: tk.literal.createString(doc), jsValue: doc }],
    });
    tk.type.finishType(property);
  }
  return property;
}

function createOperationParametersModel(
  context: AzuriteEmitterContext,
  operationName: string,
  parameters: readonly BuiltOperationParameter[],
  requestBody: BuiltRequestBody | undefined,
  doc: string | undefined,
): Model {
  const tk = context.tk;
  const model = tk.model.create({
    name: `${operationName}Parameters`,
    properties: {},
    expression: false,
    decorators: doc ? [[$doc, doc]] : [],
  });

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
  context: AzuriteEmitterContext,
  operationName: string,
  responses: readonly BuiltResponse[],
) {
  const tk = context.tk;
  return tk.union.create({
    name: `${operationName}Response`,
    expression: false,
    variants: responses.map((response, index) =>
      tk.unionVariant.create({
        name: `response${index}`,
        type: createOperationResponseModel(context, response),
      }),
    ),
  });
}

function createOperationResponseModel(
  context: AzuriteEmitterContext,
  response: BuiltResponse,
): Model {
  const tk = context.tk;
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
      type: createResponseHeadersModel(context, response.headers),
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
  context: AzuriteEmitterContext,
  headers: readonly BuiltResponseHeader[],
): Model {
  const tk = context.tk;
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

function getDocHelper(context: AzuriteEmitterContext, target: Type): string | undefined {
  return context.tk.type.getDoc(target);
}

function numericTypeRef(context: AzuriteEmitterContext, target: Type): ServerTypeRef {
  const constraints = getNumericConstraints(context, target);
  return constraints === undefined ? { kind: "number" } : { kind: "number", constraints };
}

function getNumericConstraints(
  context: AzuriteEmitterContext,
  target: Type,
): ServerNumericConstraints | undefined {
  const tk = context.tk;
  const targets = getNumericConstraintTargets(target);
  const constraints: ServerNumericConstraints = {
    min: maxDefined(targets.map((candidate) => tk.type.minValue(candidate))),
    max: minDefined(targets.map((candidate) => tk.type.maxValue(candidate))),
    minExclusive: maxDefined(targets.map((candidate) => tk.type.minValueExclusive(candidate))),
    maxExclusive: minDefined(targets.map((candidate) => tk.type.maxValueExclusive(candidate))),
  };
  return Object.values(constraints).some((value) => value !== undefined) ? constraints : undefined;
}

function getNumericConstraintTargets(target: Type): Type[] {
  const targets: Type[] = [];
  for (let current: Type | undefined = target; current !== undefined;) {
    targets.push(current);
    if (current.kind === "ModelProperty") {
      current = current.sourceProperty;
    } else {
      current = undefined;
    }
  }
  if (target.kind === "ModelProperty") {
    targets.push(target.type);
  }
  return targets;
}

function maxDefined(values: readonly (number | undefined)[]): number | undefined {
  const defined = values.filter((value) => value !== undefined);
  return defined.length === 0 ? undefined : Math.max(...defined);
}

function minDefined(values: readonly (number | undefined)[]): number | undefined {
  const defined = values.filter((value) => value !== undefined);
  return defined.length === 0 ? undefined : Math.min(...defined);
}
