import type {
  ServerModel,
  ServerOperation,
  ServerOperationParameter,
  ServerResponseHeader,
  ServerTypeRef,
} from "../model.js";
import { renderFileHeader } from "./type-ref.js";

/**
 * Renders direct Azurite request/response serialization helpers for the first Queue slice.
 * The generated surface mirrors TypeSpec TS' current direction: generated functions plus
 * small helpers instead of AutoRest-style OperationSpec/Mapper tables.
 */
export function renderSerialization(serverModel: ServerModel): string {
  const supportedOperations = serverModel.operations.filter(isSerializationReady);
  const lines = [
    renderFileHeader(),
    `import type { IHandlerParameters } from "../../generated/Context";`,
    `import type IRequest from "../../generated/IRequest";`,
    `import type IResponse from "../../generated/IResponse";`,
    "",
    `type ParameterPath = string | readonly string[];`,
    `type PrimitiveTypeKind = "string" | "number" | "boolean" | "datetime" | "unknown";`,
    `type SerializationTypeRef =`,
    `  | { readonly kind: PrimitiveTypeKind }`,
    `  | { readonly kind: "array"; readonly element: SerializationTypeRef }`,
    `  | { readonly kind: "record"; readonly element: SerializationTypeRef }`,
    `  | { readonly kind: "literal"; readonly value: string | number | boolean };`,
    "",
    `interface SerializationParameter {`,
    `  readonly parameterPath: ParameterPath;`,
    `  readonly wireName: string;`,
    `  readonly type: SerializationTypeRef;`,
    `  readonly required: boolean;`,
    `  readonly collectionFormat?: ",";`,
    `  readonly headerCollectionPrefix?: string;`,
    `}`,
    "",
    `interface SerializationResponseHeader {`,
    `  readonly name: string;`,
    `  readonly wireName: string;`,
    `  readonly type: SerializationTypeRef;`,
    `  readonly headerCollectionPrefix?: string;`,
    `}`,
    "",
    `interface SerializationResponse {`,
    `  readonly statusCode: number | "*";`,
    `  readonly headers: readonly SerializationResponseHeader[];`,
    `}`,
    "",
    `interface SerializationOperation {`,
    `  readonly name: string;`,
    `  readonly queryParameters: readonly SerializationParameter[];`,
    `  readonly headerParameters: readonly SerializationParameter[];`,
    `  readonly responses: readonly SerializationResponse[];`,
    `}`,
    "",
    `export const serializationOperations: ReadonlyMap<string, SerializationOperation> = new Map([`,
  ];

  for (const op of supportedOperations) {
    lines.push(`  [${JSON.stringify(op.name)}, ${renderOperationMetadata(op)}],`);
  }
  lines.push(`]);`, "");

  lines.push(
    `export async function deserializeRequest(name: string, req: IRequest): Promise<IHandlerParameters | undefined> {`,
  );
  lines.push(`  const operation = serializationOperations.get(name);`);
  lines.push(`  if (operation === undefined) return undefined;`);
  lines.push(`  const parameters: IHandlerParameters = {};`);
  lines.push(`  for (const parameter of operation.queryParameters) {`);
  lines.push(
    `    const value = deserializeParameterValue(parameter, req.getQuery(parameter.wireName));`,
  );
  lines.push(`    setParameterValue(parameters, parameter.parameterPath, value);`);
  lines.push(`  }`);
  lines.push(`  const headers = req.getHeaders();`);
  lines.push(`  for (const parameter of operation.headerParameters) {`);
  lines.push(`    if (parameter.headerCollectionPrefix !== undefined) {`);
  lines.push(`      const dictionary: Record<string, string | string[]> = {};`);
  lines.push(`      for (const [headerName, headerValue] of Object.entries(headers)) {`);
  lines.push(
    `        if (headerName.toLowerCase().startsWith(parameter.headerCollectionPrefix.toLowerCase()) && headerValue !== undefined) {`,
  );
  lines.push(
    `          dictionary[headerName.substring(parameter.headerCollectionPrefix.length)] = headerValue;`,
  );
  lines.push(`        }`);
  lines.push(`      }`);
  lines.push(`      setParameterValue(parameters, parameter.parameterPath, dictionary);`);
  lines.push(`    } else {`);
  lines.push(
    `      const value = deserializeParameterValue(parameter, req.getHeader(parameter.wireName));`,
  );
  lines.push(`      setParameterValue(parameters, parameter.parameterPath, value);`);
  lines.push(`    }`);
  lines.push(`  }`);
  lines.push(`  return parameters;`);
  lines.push(`}`, "");

  lines.push(
    `export function serializeResponse(name: string, res: IResponse, handlerResponse: any): boolean {`,
  );
  lines.push(`  const operation = serializationOperations.get(name);`);
  lines.push(`  if (operation === undefined) return false;`);
  lines.push(`  const statusCode = handlerResponse.statusCode;`);
  lines.push(`  res.setStatusCode(statusCode);`);
  lines.push(
    `  const response = operation.responses.find((candidate) => candidate.statusCode === statusCode) ?? operation.responses.find((candidate) => candidate.statusCode === "*");`,
  );
  lines.push(`  if (response === undefined) {`);
  lines.push(
    `    throw new TypeError(\`Generated TypeSpec serializer for \${name} does not include response status code \${statusCode}\`);`,
  );
  lines.push(`  }`);
  lines.push(`  for (const header of response.headers) {`);
  lines.push(`    const value = handlerResponse[header.name];`);
  lines.push(`    if (header.headerCollectionPrefix !== undefined) {`);
  lines.push(`      if (value !== undefined) {`);
  lines.push(`        for (const [suffix, itemValue] of Object.entries(value)) {`);
  lines.push(`          if (itemValue !== undefined) {`);
  lines.push(
    `            res.setHeader(\`\${header.headerCollectionPrefix}\${suffix}\`, serializeValue(header.type, itemValue));`,
  );
  lines.push(`          }`);
  lines.push(`        }`);
  lines.push(`      }`);
  lines.push(`    } else if (value !== undefined) {`);
  lines.push(`      res.setHeader(header.wireName, serializeValue(header.type, value));`);
  lines.push(`    }`);
  lines.push(`  }`);
  lines.push(`  return true;`);
  lines.push(`}`, "");

  lines.push(`export function hasGeneratedSerialization(name: string): boolean {`);
  lines.push(`  return serializationOperations.has(name);`);
  lines.push(`}`, "");

  lines.push(`function deserializeParameterValue(`);
  lines.push(`  parameter: SerializationParameter,`);
  lines.push(`  rawValue: string | string[] | undefined,`);
  lines.push(`): unknown {`);
  lines.push(`  if (parameter.required && rawValue === undefined) {`);
  lines.push(
    `    throw new TypeError(\`Required parameter \${parameter.wireName} was not provided\`);`,
  );
  lines.push(`  }`);
  lines.push(`  if (rawValue === undefined) return undefined;`);
  lines.push(`  const normalizedValue = Array.isArray(rawValue) ? rawValue.join(",") : rawValue;`);
  lines.push(`  if (parameter.type.kind === "literal") {`);
  lines.push(`    const value = deserializeValue(parameter.type, normalizedValue);`);
  lines.push(`    if (value !== parameter.type.value) {`);
  lines.push(
    `      throw new TypeError(\`Parameter \${parameter.wireName} expected \${parameter.type.value} but received \${normalizedValue}\`);`,
  );
  lines.push(`    }`);
  lines.push(`    return value;`);
  lines.push(`  }`);
  lines.push(
    `  if (parameter.collectionFormat !== undefined && parameter.type.kind === "array") {`,
  );
  lines.push(`    const elementType = parameter.type.element;`);
  lines.push(
    `    return normalizedValue.split(parameter.collectionFormat).map((item: string) => deserializeValue(elementType, item));`,
  );
  lines.push(`  }`);
  lines.push(`  return deserializeValue(parameter.type, normalizedValue);`);
  lines.push(`}`, "");

  lines.push(`function deserializeValue(type: SerializationTypeRef, value: string): unknown {`);
  lines.push(`  switch (type.kind) {`);
  lines.push(`    case "number":`);
  lines.push(`      return Number(value);`);
  lines.push(`    case "boolean":`);
  lines.push(`      return value === "true" ? true : value === "false" ? false : value;`);
  lines.push(`    case "datetime":`);
  lines.push(`    case "string":`);
  lines.push(`    case "unknown":`);
  lines.push(`      return value;`);
  lines.push(`    case "literal":`);
  lines.push(`      return type.value;`);
  lines.push(`    case "array":`);
  lines.push(`      return value.split(",").map((item) => deserializeValue(type.element, item));`);
  lines.push(`    case "record":`);
  lines.push(`      return value;`);
  lines.push(`  }`);
  lines.push(`}`, "");

  lines.push(
    `function serializeValue(type: SerializationTypeRef, value: any): string | number | boolean {`,
  );
  lines.push(`  switch (type.kind) {`);
  lines.push(`    case "number":`);
  lines.push(`    case "boolean":`);
  lines.push(`      return value;`);
  lines.push(`    case "datetime":`);
  lines.push(`      return value instanceof Date ? value.toUTCString() : String(value);`);
  lines.push(`    case "literal":`);
  lines.push(`      return type.value;`);
  lines.push(`    case "array":`);
  lines.push(
    `      return value.map((item: any) => serializeValue(type.element, item)).join(",");`,
  );
  lines.push(`    case "record":`);
  lines.push(`    case "string":`);
  lines.push(`    case "unknown":`);
  lines.push(`      return String(value);`);
  lines.push(`  }`);
  lines.push(`}`, "");

  lines.push(`function setParameterValue(`);
  lines.push(`  parameters: IHandlerParameters,`);
  lines.push(`  parameterPath: ParameterPath,`);
  lines.push(`  parameterValue: unknown,`);
  lines.push(`): void {`);
  lines.push(`  if (typeof parameterPath === "string") {`);
  lines.push(`    parameters[parameterPath] = parameterValue;`);
  lines.push(`    return;`);
  lines.push(`  }`);
  lines.push(`  let leafParent = parameters;`);
  lines.push(`  for (let i = 0; i < parameterPath.length - 1; i++) {`);
  lines.push(`    const currentPropertyName = parameterPath[i];`);
  lines.push(`    if (!leafParent[currentPropertyName]) {`);
  lines.push(`      leafParent[currentPropertyName] = {};`);
  lines.push(`    }`);
  lines.push(`    leafParent = leafParent[currentPropertyName];`);
  lines.push(`  }`);
  lines.push(`  leafParent[parameterPath[parameterPath.length - 1]] = parameterValue;`);
  lines.push(`}`, "");

  return lines.join("\n");
}

function isSerializationReady(op: ServerOperation): boolean {
  if (op.requestBody !== undefined) return false;
  return op.responses.every(
    (response) => response.statusCode === "*" || response.body === undefined,
  );
}

function renderOperationMetadata(op: ServerOperation): string {
  const queryParameters = [
    ...op.literalQueryParameters.map((literal) =>
      renderParameterMetadata({
        parameterPath: literal.name,
        wireName: literal.name,
        type: { kind: "literal", value: literal.value },
        required: true,
      }),
    ),
    ...op.parameters
      .filter((p) => p.location === "query")
      .map((param) =>
        renderParameterMetadata({
          parameterPath: getParameterPath(param),
          wireName: param.wireName,
          type: param.type,
          required: !param.optional,
        }),
      ),
  ];
  const headerParameters = op.parameters
    .filter((p) => p.location === "header")
    .map((param) =>
      renderParameterMetadata({
        parameterPath: getParameterPath(param),
        wireName: param.wireName,
        type: param.type,
        required: !param.optional,
      }),
    );
  const responses = op.responses.map(
    (response) =>
      `{ statusCode: ${JSON.stringify(response.statusCode)}, headers: [${response.headers
        .map(renderHeaderMetadata)
        .join(", ")}] }`,
  );

  return `{
    name: ${JSON.stringify(op.name)},
    queryParameters: [${queryParameters.join(", ")}],
    headerParameters: [${headerParameters.join(", ")}],
    responses: [${responses.join(", ")}],
  }`;
}

function renderParameterMetadata(input: {
  parameterPath: string | readonly string[];
  wireName: string;
  type: ServerTypeRef;
  required: boolean;
}): string {
  const properties = [
    `parameterPath: ${JSON.stringify(input.parameterPath)}`,
    `wireName: ${JSON.stringify(input.wireName)}`,
    `type: ${renderSerializationTypeRef(input.type)}`,
    `required: ${input.required}`,
  ];
  const collectionFormat = getCollectionFormat(input.type);
  if (collectionFormat !== undefined) {
    properties.push(`collectionFormat: ${JSON.stringify(collectionFormat)}`);
  }
  const headerCollectionPrefix = getHeaderCollectionPrefix(input.wireName);
  if (headerCollectionPrefix !== undefined) {
    properties.push(`headerCollectionPrefix: ${JSON.stringify(headerCollectionPrefix)}`);
  }
  return `{ ${properties.join(", ")} }`;
}

function renderHeaderMetadata(header: ServerResponseHeader): string {
  const properties = [
    `name: ${JSON.stringify(header.name)}`,
    `wireName: ${JSON.stringify(header.wireName)}`,
    `type: ${renderSerializationTypeRef(header.type)}`,
  ];
  const headerCollectionPrefix = getHeaderCollectionPrefix(header.wireName);
  if (headerCollectionPrefix !== undefined) {
    properties.push(`headerCollectionPrefix: ${JSON.stringify(headerCollectionPrefix)}`);
  }
  return `{ ${properties.join(", ")} }`;
}

function renderSerializationTypeRef(type: ServerTypeRef): string {
  switch (type.kind) {
    case "array":
      return `{ kind: "array", element: ${renderSerializationTypeRef(type.element)} }`;
    case "record":
      return `{ kind: "record", element: ${renderSerializationTypeRef(type.element)} }`;
    case "literal":
      return `{ kind: "literal", value: ${JSON.stringify(type.value)} }`;
    case "model":
      return `{ kind: "unknown" }`;
    case "number":
    case "boolean":
    case "datetime":
    case "string":
    case "unknown":
      return `{ kind: ${JSON.stringify(type.kind)} }`;
  }
}

function getParameterPath(param: ServerOperationParameter): string | readonly string[] {
  if (param.optional) return ["options", getHandlerParameterName(param)];
  return param.name;
}

function getHandlerParameterName(param: ServerOperationParameter): string {
  return param.wireName.toLowerCase() === "x-ms-client-request-id" ? "requestId" : param.name;
}

function getHeaderCollectionPrefix(wireName: string): string | undefined {
  return wireName.toLowerCase() === "x-ms-meta" ? "x-ms-meta-" : undefined;
}

function getCollectionFormat(type: ServerTypeRef): "," | undefined {
  return type.kind === "array" ? "," : undefined;
}
