import * as ts from "@alloy-js/typescript";
import {
  $doc,
  type DecoratorContext,
  type Model,
  type ModelProperty,
  type Type,
} from "@typespec/compiler";
import {
  getAllHttpServices,
  type HttpOperation,
  type HttpOperationParameter,
  type HttpOperationResponse,
  type HttpPayloadBody,
} from "@typespec/http";
import "@typespec/http/experimental/typekit";
import { isAttribute, isUnwrapped } from "@typespec/xml";
import type { AzuriteEmitterContext } from "./context.js";
import { createDiagnostic } from "./lib.js";
import type {
  ServerLiteralQueryParameter,
  ServerModel,
  ServerModelProperty,
  ServerNumericConstraints,
  ServerOperation,
  ServerOperationParameter,
  ServerParameterLocation,
  ServerRequestBody,
  ServerResponse,
  ServerResponseHeader,
  ServerSkippedOperation,
  ServerTypeRef,
} from "./model.js";
import { getName, hasNameOverride } from "./utils.js";

const tsNamePolicy = ts.createTSNamePolicy();

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
 * Operations the transform phase can't represent are skipped with a reason in
 * `skippedOperations`.
 */
export function buildServerModel(
  context: AzuriteEmitterContext,
  service = getAllHttpServices(context.program)[0][0],
): ServerModel {
  const operations: ServerOperation[] = [];
  const skippedOperations: ServerSkippedOperation[] = [];
  const operationNames = planOperationNames(context, service?.operations ?? []);
  for (const op of service?.operations ?? []) {
    try {
      const names = operationNames.get(op);
      if (names === undefined) continue;
      const built = buildOperation(context, names.runtimeName, names.typeName, op);
      operations.push(built);
    } catch (error) {
      skippedOperations.push({
        name: getName(context, op.operation, getTypeName(op.operation.name)),
        reason: error instanceof Error ? error.message : String(error),
        target: op.operation,
      });
    }
  }

  return {
    serviceName: service ? getName(context, service.namespace, service.namespace.name) : "Service",
    operations,
    models: [...context.modelRegistry.values()],
    skippedOperations,
  };
}

function buildOperation(
  context: AzuriteEmitterContext,
  name: string,
  typeName: string,
  op: HttpOperation,
): ServerOperation {
  const parameters = op.parameters.parameters.map((p) => buildParameter(context, p));

  const requestBody = op.parameters.body
    ? buildRequestBody(context, op.parameters.body)
    : undefined;

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
  context: AzuriteEmitterContext,
  param: HttpOperationParameter,
): BuiltOperationParameter {
  const location: ServerParameterLocation =
    param.type === "cookie" ? "header" : (param.type as ServerParameterLocation);
  const type = isHeaderCollection(param.name)
    ? getHeaderCollectionTypeMetadata(context)
    : getTypeMetadata(context, param.param.type, param.param);
  return {
    name: getName(context, param.param, param.param.name),
    wireName: param.name,
    location,
    type: type.runtime,
    declarationType: type.declaration,
    optional: param.param.optional,
  };
}

function buildRequestBody(context: AzuriteEmitterContext, body: HttpPayloadBody): BuiltRequestBody {
  const type = getTypeMetadata(context, body.type, body.property ?? body.type);
  return {
    type: type.runtime,
    declarationType: type.declaration,
    contentTypes: body.contentTypes,
    parameterPath: "body",
  };
}

function buildResponse(
  context: AzuriteEmitterContext,
  response: HttpOperationResponse,
): BuiltResponse {
  const content = response.responses[0];
  const headers: BuiltResponseHeader[] = [];
  for (const [headerWireName, prop] of Object.entries(content?.headers ?? {})) {
    const type = isHeaderCollection(headerWireName)
      ? getHeaderCollectionTypeMetadata(context)
      : getTypeMetadata(context, prop.type, prop);
    headers.push({
      name: getName(context, prop, prop.name),
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
        ? buildRequestBody(context, content.body)
        : undefined,
  };
}

function isHeaderCollection(wireName: string): boolean {
  return wireName.toLowerCase() === "x-ms-meta";
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
  context: AzuriteEmitterContext,
  type: Type,
  constraintTarget: Type = type,
): TypeMetadata {
  const tk = context.tk;
  switch (type.kind) {
    case "Scalar":
      const scalarName = type.name || "<anonymous>";
      if (tk.scalar.extendsNumeric(type))
        return {
          runtime: numericTypeRef(context, constraintTarget),
          declaration: type,
        };
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
      throw new Error(`unsupported scalar ${scalarName}`);
    case "Boolean":
      return { runtime: { kind: "literal", value: type.value }, declaration: type };
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
        throw new Error("numeric literal cannot be represented as a JavaScript number");
      }
      return {
        runtime: { kind: "literal", value },
        declaration: type,
      };
    }
    case "Enum": {
      // TypeSpec string enums are represented on the wire as strings; generated TypeScript
      // declarations keep them as string because Azurite handlers do not need enum objects.
      return { runtime: { kind: "string" }, declaration: tk.builtin.string };
    }
    case "Model": {
      if (tk.array.is(type)) {
        const element = getTypeMetadata(context, tk.array.getElementType(type));
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
    case "Union": {
      const variants = [...type.variants.values()].map(
        (variant) => getTypeMetadata(context, variant.type).runtime,
      );
      return { runtime: { kind: "union", variants }, declaration: tk.intrinsic.any };
    }
    default:
      throw new Error(`unsupported TypeSpec type kind ${type.kind}`);
  }
}

function registerModel(context: AzuriteEmitterContext, model: Model): ServerTypeRef {
  const tk = context.tk;
  const name = resolveModelName(context, model);
  if (!context.modelRegistry.has(name)) {
    const declarationModel = createDeclarationModel(context, name, model);
    // Insert a placeholder first to guard against infinite recursion on cyclic models.
    context.modelRegistry.set(name, { name, wireName: name, properties: [], declarationModel });
    const properties = [...tk.model.getProperties(model).values()].map((prop) =>
      buildModelProperty(context, prop, declarationModel),
    );
    context.modelRegistry.set(name, {
      name,
      wireName: context.tk.type.getEncodedName(model, "application/xml"),
      properties,
      declarationModel,
      doc: getDocHelper(context, model),
    });
  }
  return { kind: "model", name };
}

/**
 * Resolves the generated TS type name for `model`. Named models use their TypeSpec name
 * directly; anonymous models (`model.name === ""`) get a stable, unique `AnonymousModelN` name
 * keyed by *object identity* so that two structurally-different anonymous models never clobber
 * each other under the same cache key.
 */
function resolveModelName(context: AzuriteEmitterContext, model: Model): string {
  if (model.name) return getName(context, model, getTypeName(model.name));
  const existingNamedModel = findStructurallyEquivalentNamedModel(context, model);
  if (existingNamedModel) return existingNamedModel;
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

function findStructurallyEquivalentNamedModel(
  context: AzuriteEmitterContext,
  model: Model,
): string | undefined {
  const tk = context.tk;
  const anonymousProperties = [...tk.model.getProperties(model).values()];
  for (const candidate of context.modelRegistry.values()) {
    if (candidate.name.startsWith("AnonymousModel")) continue;
    if (candidate.properties.length !== anonymousProperties.length) continue;
    const candidateProperties = new Map(candidate.properties.map((prop) => [prop.name, prop]));
    let matches = true;
    for (const prop of anonymousProperties) {
      const name = getName(context, prop, prop.name);
      const candidateProp = candidateProperties.get(name);
      if (
        candidateProp === undefined ||
        candidateProp.optional !== prop.optional ||
        candidateProp.wireName !== context.tk.type.getEncodedName(prop, "application/xml")
      ) {
        matches = false;
        break;
      }
      const typeRef = getTypeMetadata(context, prop.type).runtime;
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
  context: AzuriteEmitterContext,
  prop: ModelProperty,
  declarationModel: Model,
): ServerModelProperty {
  const type = getTypeMetadata(context, prop.type, prop);
  createDeclarationProperty(context, prop, declarationModel, type);
  return {
    name: getName(context, prop, prop.name),
    wireName: context.tk.type.getEncodedName(prop, "application/xml"),
    type: type.runtime,
    optional: prop.optional,
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
  const model = tk.model.create({
    name,
    properties: {},
    expression: false,
  });
  applyDoc(context, model, getDocHelper(context, sourceModel));
  return model;
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
    optional: source.optional,
    defaultValue: source.defaultValue,
  });
  property.model = declarationModel;
  declarationModel.properties.set(property.name, property);
  applyDoc(context, property, getDocHelper(context, source));
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
  });
  applyDoc(context, model, doc);

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

function applyDoc(context: AzuriteEmitterContext, target: Type, doc: string | undefined): void {
  if (!doc) return;
  // Typekit can read docs but does not expose a public setter; use the public @doc
  // decorator so emitter-framework typed declarations can infer copied docs.
  $doc({ program: context.program } as DecoratorContext, target, doc);
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
