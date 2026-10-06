import type { ServerModel, ServerOperation } from "../model.js";
import { renderFileHeader } from "./type-ref.js";

/**
 * Renders Azurite request/response serialization helpers for the first Queue slice.
 * The entrypoints are direct and operation-aware, while trivial no-body operations share
 * metadata-driven binding helpers instead of repeating one serializer per operation.
 */
export function renderSerialization(serverModel: ServerModel): string {
  const supportedOperations = serverModel.operations.filter(isSerializationReady);
  const lines = [
    renderFileHeader(),
    `import type { IHandlerParameters } from "../../generated/Context";`,
    `import type IRequest from "../../generated/IRequest";`,
    `import type IResponse from "../../generated/IResponse";`,
    `import { operations } from "./operations";`,
    `import type { OperationMetadata, OperationParameterBinding, OperationResponseHeaderBinding, OperationTypeBinding } from "./operations.js";`,
    "",
    renderDeserializeRequest(supportedOperations),
    "",
    renderSerializeResponse(supportedOperations),
    "",
    renderHasGeneratedSerialization(supportedOperations),
    "",
    renderHelpers(),
    "",
  ];

  return lines.join("\n");
}

function isSerializationReady(op: ServerOperation): boolean {
  if (op.requestBody !== undefined) return false;
  return op.responses.every(
    (response) => response.statusCode === "*" || response.body === undefined,
  );
}

function renderDeserializeRequest(operations: readonly ServerOperation[]): string {
  const lines = [
    `export async function deserializeRequest(name: string, req: IRequest): Promise<IHandlerParameters | undefined> {`,
    `  switch (name) {`,
  ];
  for (const op of operations) {
    lines.push(`    case ${JSON.stringify(op.name)}:`);
    lines.push(`      return deserializeMetadataRequest(getGeneratedOperation(name), req);`);
  }
  lines.push(`    default:`);
  lines.push(`      return undefined;`);
  lines.push(`  }`);
  lines.push(`}`);
  return lines.join("\n");
}

function renderSerializeResponse(operations: readonly ServerOperation[]): string {
  const lines = [
    `export function serializeResponse(name: string, res: IResponse, handlerResponse: any): boolean {`,
    `  switch (name) {`,
  ];
  for (const op of operations) {
    lines.push(`    case ${JSON.stringify(op.name)}:`);
    lines.push(
      `      serializeMetadataResponse(getGeneratedOperation(name), res, handlerResponse);`,
    );
    lines.push(`      return true;`);
  }
  lines.push(`    default:`);
  lines.push(`      return false;`);
  lines.push(`  }`);
  lines.push(`}`);
  return lines.join("\n");
}

function renderHasGeneratedSerialization(operations: readonly ServerOperation[]): string {
  const lines = [
    `export function hasGeneratedSerialization(name: string): boolean {`,
    `  switch (name) {`,
  ];
  for (const op of operations) {
    lines.push(`    case ${JSON.stringify(op.name)}:`);
  }
  if (operations.length > 0) {
    lines.push(`      return true;`);
  }
  lines.push(`    default:`);
  lines.push(`      return false;`);
  lines.push(`  }`);
  lines.push(`}`);
  return lines.join("\n");
}

function renderHelpers(): string {
  const lines = [
    `function getGeneratedOperation(name: string): OperationMetadata {`,
    `  const metadata = operations.find((operation) => operation.name === name);`,
    `  if (metadata === undefined) {`,
    `    throw new TypeError(\`Generated TypeSpec serialization metadata does not include operation \${name}\`);`,
    `  }`,
    `  return metadata;`,
    `}`,
    "",
    `function deserializeMetadataRequest(metadata: OperationMetadata, req: IRequest): IHandlerParameters {`,
    `  const parameters: IHandlerParameters = {};`,
    `  for (const literal of metadata.literalQueryParameters) {`,
    `    setParameterValue(`,
    `      parameters,`,
    `      literal.name,`,
    `      deserializeLiteral(req.getQuery(literal.name), literal.value, literal.name, true),`,
    `    );`,
    `  }`,
    `  const headerCollectionValues = new Map<string, Record<string, string | string[]>>();`,
    `  for (const parameter of metadata.parameters) {`,
    `    if (parameter.location === "path") continue;`,
    `    setParameterValue(parameters, getParameterPath(parameter), deserializeParameter(parameter, req, headerCollectionValues));`,
    `  }`,
    `  return parameters;`,
    `}`,
    "",
    `function deserializeParameter(`,
    `  parameter: OperationParameterBinding,`,
    `  req: IRequest,`,
    `  headerCollectionValues: Map<string, Record<string, string | string[]>>,`,
    `): unknown {`,
    `  if (parameter.location === "query") {`,
    `    return deserializeValue(parameter.type, req.getQuery(parameter.wireName), parameter.wireName, parameter.required);`,
    `  }`,
    `  const headerCollectionPrefix = getHeaderCollectionPrefix(parameter.wireName);`,
    `  if (headerCollectionPrefix !== undefined) {`,
    `    if (!headerCollectionValues.has(headerCollectionPrefix)) {`,
    `      headerCollectionValues.set(headerCollectionPrefix, getHeaderCollection(req.getHeaders(), headerCollectionPrefix));`,
    `    }`,
    `    return headerCollectionValues.get(headerCollectionPrefix);`,
    `  }`,
    `  return deserializeValue(parameter.type, req.getHeader(parameter.wireName), parameter.wireName, parameter.required);`,
    `}`,
    "",
    `function serializeMetadataResponse(metadata: OperationMetadata, res: IResponse, handlerResponse: any): void {`,
    `  const statusCode = handlerResponse.statusCode;`,
    `  res.setStatusCode(statusCode);`,
    `  const response = metadata.responses.find((candidate) => candidate.statusCode === statusCode) ?? metadata.responses.find((candidate) => candidate.statusCode === "*");`,
    `  if (response === undefined) {`,
    `    throw new TypeError(\`Generated TypeSpec serializer for \${metadata.name} does not include response status code \${statusCode}\`);`,
    `  }`,
    `  for (const header of response.headers) {`,
    `    serializeResponseHeader(res, header, handlerResponse);`,
    `  }`,
    `}`,
    "",
    `function serializeResponseHeader(res: IResponse, header: OperationResponseHeaderBinding, handlerResponse: any): void {`,
    `  const headerCollectionPrefix = getHeaderCollectionPrefix(header.wireName);`,
    `  if (headerCollectionPrefix !== undefined) {`,
    `    setHeaderCollection(res, headerCollectionPrefix, handlerResponse[header.name]);`,
    `    return;`,
    `  }`,
    `  setHeader(res, header.wireName, serializeValue(header.type, handlerResponse[header.name]));`,
    `}`,
    "",
    `function deserializeValue(`,
    `  type: OperationTypeBinding,`,
    `  value: string | string[] | undefined,`,
    `  wireName: string,`,
    `  required: boolean,`,
    `): unknown {`,
    `  switch (type.kind) {`,
    `    case "number":`,
    `      return deserializeNumber(value, wireName, required);`,
    `    case "boolean":`,
    `      return deserializeBoolean(value, wireName, required);`,
    `    case "literal":`,
    `      return deserializeLiteral(value, type.value, wireName, required);`,
    `    case "array":`,
    `      return deserializeArray(value, wireName, required, (item) => deserializeArrayItem(type.element, item));`,
    `    case "datetime":`,
    `    case "model":`,
    `    case "record":`,
    `    case "string":`,
    `    case "unknown":`,
    `      return deserializeString(value, wireName, required);`,
    `  }`,
    `}`,
    "",
    `function deserializeString(value: string | string[] | undefined, wireName: string, required: boolean): string | undefined {`,
    `  const normalized = normalizeValue(value);`,
    `  if (required && normalized === undefined) {`,
    `    throw new TypeError(\`Required parameter \${wireName} was not provided\`);`,
    `  }`,
    `  return normalized;`,
    `}`,
  ];

  lines.push(
    "",
    `function deserializeNumber(value: string | string[] | undefined, wireName: string, required: boolean): number | undefined {`,
    `  const normalized = deserializeString(value, wireName, required);`,
    `  return normalized === undefined ? undefined : Number(normalized);`,
    `}`,
    "",
    `function deserializeBoolean(value: string | string[] | undefined, wireName: string, required: boolean): boolean | string | undefined {`,
    `  const normalized = deserializeString(value, wireName, required);`,
    `  if (normalized === undefined) return undefined;`,
    `  return normalized === "true" ? true : normalized === "false" ? false : normalized;`,
    `}`,
    "",
    `function deserializeLiteral(`,
    `  value: string | string[] | undefined,`,
    `  expected: string | number | boolean,`,
    `  wireName: string,`,
    `  required: boolean,`,
    `): string | number | boolean | undefined {`,
    `  const normalized = deserializeString(value, wireName, required);`,
    `  if (normalized === undefined) return undefined;`,
    `  if (String(expected) !== normalized) {`,
    `    throw new TypeError(\`Parameter \${wireName} expected \${expected} but received \${normalized}\`);`,
    `  }`,
    `  return expected;`,
    `}`,
  );

  lines.push(
    "",
    `function deserializeArray<T>(`,
    `  value: string | string[] | undefined,`,
    `  wireName: string,`,
    `  required: boolean,`,
    `  itemDeserializer: (item: string) => T,`,
    `): T[] | undefined {`,
    `  const normalized = deserializeString(value, wireName, required);`,
    `  return normalized === undefined ? undefined : normalized.split(",").map(itemDeserializer);`,
    `}`,
    "",
    `function deserializeArrayItem(type: OperationTypeBinding, value: string): unknown {`,
    `  switch (type.kind) {`,
    `    case "number":`,
    `      return Number(value);`,
    `    case "boolean":`,
    `      return value === "true" ? true : value === "false" ? false : value;`,
    `    case "literal":`,
    `      return type.value;`,
    `    case "array":`,
    `      return value.split(",").map((nestedItem) => deserializeArrayItem(type.element, nestedItem));`,
    `    case "datetime":`,
    `    case "model":`,
    `    case "record":`,
    `    case "string":`,
    `    case "unknown":`,
    `      return value;`,
    `  }`,
    `}`,
    "",
    `function normalizeValue(value: string | string[] | undefined): string | undefined {`,
    `  return Array.isArray(value) ? value.join(",") : value;`,
    `}`,
    "",
    `function getHeaderCollectionPrefix(wireName: string): string | undefined {`,
    `  return wireName.toLowerCase() === "x-ms-meta" ? "x-ms-meta-" : undefined;`,
    `}`,
    "",
    `function getHeaderCollection(`,
    `  headers: Record<string, string | string[] | undefined>,`,
    `  prefix: string,`,
    `): Record<string, string | string[]> {`,
    `  const values: Record<string, string | string[]> = {};`,
    `  for (const [headerName, headerValue] of Object.entries(headers)) {`,
    `    if (headerName.toLowerCase().startsWith(prefix.toLowerCase()) && headerValue !== undefined) {`,
    `      values[headerName.substring(prefix.length)] = headerValue;`,
    `    }`,
    `  }`,
    `  return values;`,
    `}`,
    "",
    `function serializeValue(type: OperationTypeBinding, value: unknown): string | number | boolean | undefined {`,
    `  if (value === undefined) return undefined;`,
    `  switch (type.kind) {`,
    `    case "datetime":`,
    `      return value instanceof Date ? value.toUTCString() : String(value);`,
    `    case "array":`,
    `      return Array.isArray(value) ? value.map((item) => serializeValue(type.element, item)).join(",") : String(value);`,
    `    case "literal":`,
    `      return type.value;`,
    `    case "boolean":`,
    `    case "number":`,
    `    case "model":`,
    `    case "record":`,
    `    case "string":`,
    `    case "unknown":`,
    `      return value as string | number | boolean;`,
    `  }`,
    `}`,
    "",
    `function setHeader(res: IResponse, name: string, value: string | number | boolean | undefined): void {`,
    `  if (value !== undefined) {`,
    `    res.setHeader(name, value);`,
    `  }`,
    `}`,
    "",
    `function setHeaderCollection(res: IResponse, prefix: string, value: Record<string, unknown> | undefined): void {`,
    `  if (value === undefined) return;`,
    `  for (const [suffix, itemValue] of Object.entries(value)) {`,
    `    if (itemValue !== undefined) {`,
    `      res.setHeader(\`\${prefix}\${suffix}\`, String(itemValue));`,
    `    }`,
    `  }`,
    `}`,
    "",
    `function setParameterValue(`,
    `  parameters: IHandlerParameters,`,
    `  parameterPath: string | readonly string[],`,
    `  parameterValue: unknown,`,
    `): void {`,
    `  if (typeof parameterPath === "string") {`,
    `    parameters[parameterPath] = parameterValue;`,
    `    return;`,
    `  }`,
    `  let leafParent = parameters;`,
    `  for (let i = 0; i < parameterPath.length - 1; i++) {`,
    `    const currentPropertyName = parameterPath[i];`,
    `    if (!leafParent[currentPropertyName]) {`,
    `      leafParent[currentPropertyName] = {};`,
    `    }`,
    `    leafParent = leafParent[currentPropertyName];`,
    `  }`,
    `  leafParent[parameterPath[parameterPath.length - 1]] = parameterValue;`,
    `}`,
    "",
    `function getParameterPath(parameter: OperationParameterBinding): string | readonly string[] {`,
    `  if (!parameter.required) return ["options", getHandlerParameterName(parameter)];`,
    `  return parameter.name;`,
    `}`,
    "",
    `function getHandlerParameterName(parameter: OperationParameterBinding): string {`,
    `  return parameter.wireName.toLowerCase() === "x-ms-client-request-id" ? "requestId" : parameter.name;`,
    `}`,
  );

  return lines.join("\n");
}
