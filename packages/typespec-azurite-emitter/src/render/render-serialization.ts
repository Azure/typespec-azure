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
 * The generated surface mirrors TypeSpec TS' current direction: operation-specific functions
 * plus small helpers instead of AutoRest-style OperationSpec/Mapper tables.
 */
export function renderSerialization(serverModel: ServerModel): string {
  const supportedOperations = serverModel.operations.filter(isSerializationReady);
  const lines = [
    renderFileHeader(),
    `import type { IHandlerParameters } from "../../generated/Context";`,
    `import type IRequest from "../../generated/IRequest";`,
    `import type IResponse from "../../generated/IResponse";`,
    "",
    renderDeserializeRequest(supportedOperations),
    "",
    renderSerializeResponse(supportedOperations),
    "",
    renderHasGeneratedSerialization(supportedOperations),
    "",
  ];

  for (const op of supportedOperations) {
    lines.push(renderOperationDeserializer(op), "");
    lines.push(renderOperationSerializer(op), "");
  }

  lines.push(renderHelpers(supportedOperations), "");
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
    lines.push(`      return deserialize${getFunctionSuffix(op)}Request(req);`);
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
    lines.push(`      serialize${getFunctionSuffix(op)}Response(res, handlerResponse);`);
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

function renderOperationDeserializer(op: ServerOperation): string {
  const lines = [
    `function deserialize${getFunctionSuffix(op)}Request(req: IRequest): IHandlerParameters {`,
    `  const parameters: IHandlerParameters = {};`,
  ];

  for (const literal of op.literalQueryParameters) {
    lines.push(
      ...renderSetParameterValue(
        literal.name,
        renderDeserializeValue(
          { kind: "literal", value: literal.value },
          `req.getQuery(${JSON.stringify(literal.name)})`,
          literal.name,
          true,
        ),
      ),
    );
  }

  for (const param of op.parameters.filter((p) => p.location === "query")) {
    lines.push(
      ...renderSetParameterValue(
        getParameterPath(param),
        renderDeserializeValue(
          param.type,
          `req.getQuery(${JSON.stringify(param.wireName)})`,
          param.wireName,
          !param.optional,
        ),
      ),
    );
  }

  const headerParameters = op.parameters.filter((p) => p.location === "header");
  if (headerParameters.some((p) => getHeaderCollectionPrefix(p.wireName) !== undefined)) {
    lines.push(`  const headers = req.getHeaders();`);
  }

  for (const param of headerParameters) {
    const headerCollectionPrefix = getHeaderCollectionPrefix(param.wireName);
    if (headerCollectionPrefix !== undefined) {
      lines.push(
        ...renderSetParameterValue(
          getParameterPath(param),
          `getHeaderCollection(headers, ${JSON.stringify(headerCollectionPrefix)})`,
        ),
      );
    } else {
      lines.push(
        ...renderSetParameterValue(
          getParameterPath(param),
          renderDeserializeValue(
            param.type,
            `req.getHeader(${JSON.stringify(param.wireName)})`,
            param.wireName,
            !param.optional,
          ),
        ),
      );
    }
  }

  lines.push(`  return parameters;`);
  lines.push(`}`);
  return lines.join("\n");
}

function renderOperationSerializer(op: ServerOperation): string {
  const lines = [
    `function serialize${getFunctionSuffix(op)}Response(res: IResponse, handlerResponse: any): void {`,
    `  const statusCode = handlerResponse.statusCode;`,
    `  res.setStatusCode(statusCode);`,
    `  switch (statusCode) {`,
  ];

  const defaultResponse = op.responses.find((response) => response.statusCode === "*");
  for (const response of op.responses.filter((r) => r.statusCode !== "*")) {
    lines.push(`    case ${response.statusCode}:`);
    lines.push(...indent(renderResponseHeaders(response.headers), 6));
    lines.push(`      return;`);
  }
  if (defaultResponse) {
    lines.push(`    default:`);
    lines.push(...indent(renderResponseHeaders(defaultResponse.headers), 6));
    lines.push(`      return;`);
  } else {
    lines.push(`    default:`);
    lines.push(
      `      throw new TypeError(\`Generated TypeSpec serializer for ${op.name} does not include response status code \${statusCode}\`);`,
    );
  }

  lines.push(`  }`);
  lines.push(`}`);
  return lines.join("\n");
}

function renderResponseHeaders(headers: readonly ServerResponseHeader[]): string[] {
  const lines: string[] = [];
  for (const header of headers) {
    const headerCollectionPrefix = getHeaderCollectionPrefix(header.wireName);
    if (headerCollectionPrefix !== undefined) {
      lines.push(
        `setHeaderCollection(res, ${JSON.stringify(headerCollectionPrefix)}, handlerResponse[${JSON.stringify(
          header.name,
        )}]);`,
      );
    } else {
      lines.push(
        `setHeader(res, ${JSON.stringify(header.wireName)}, ${renderSerializeValue(
          header.type,
          `handlerResponse[${JSON.stringify(header.name)}]`,
        )});`,
      );
    }
  }
  return lines;
}

function renderDeserializeValue(
  type: ServerTypeRef,
  valueExpression: string,
  wireName: string,
  required: boolean,
): string {
  switch (type.kind) {
    case "number":
      return `deserializeNumber(${valueExpression}, ${JSON.stringify(wireName)}, ${required})`;
    case "boolean":
      return `deserializeBoolean(${valueExpression}, ${JSON.stringify(wireName)}, ${required})`;
    case "literal":
      return `deserializeLiteral(${valueExpression}, ${JSON.stringify(type.value)}, ${JSON.stringify(
        wireName,
      )}, ${required})`;
    case "array":
      return `deserializeArray(${valueExpression}, ${JSON.stringify(wireName)}, ${required}, (item) => ${renderDeserializeArrayItem(
        type.element,
        "item",
      )})`;
    case "datetime":
    case "model":
    case "record":
    case "string":
    case "unknown":
      return `deserializeString(${valueExpression}, ${JSON.stringify(wireName)}, ${required})`;
  }
}

function renderSetParameterValue(
  parameterPath: string | readonly string[],
  valueExpression: string,
): string[] {
  return [
    `  setParameterValue(`,
    `    parameters,`,
    `    ${renderParameterPath(parameterPath)},`,
    `    ${valueExpression},`,
    `  );`,
  ];
}

function renderParameterPath(parameterPath: string | readonly string[]): string {
  return typeof parameterPath === "string"
    ? JSON.stringify(parameterPath)
    : `[${parameterPath.map((path) => JSON.stringify(path)).join(", ")}]`;
}

function renderDeserializeArrayItem(type: ServerTypeRef, itemExpression: string): string {
  switch (type.kind) {
    case "number":
      return `Number(${itemExpression})`;
    case "boolean":
      return `${itemExpression} === "true" ? true : ${itemExpression} === "false" ? false : ${itemExpression}`;
    case "literal":
      return JSON.stringify(type.value);
    case "array":
      return `${itemExpression}.split(",").map((nestedItem) => ${renderDeserializeArrayItem(
        type.element,
        "nestedItem",
      )})`;
    case "datetime":
    case "model":
    case "record":
    case "string":
    case "unknown":
      return itemExpression;
  }
}

function renderSerializeValue(type: ServerTypeRef, valueExpression: string): string {
  switch (type.kind) {
    case "datetime":
      return `serializeDateTime(${valueExpression})`;
    case "array":
      return `${valueExpression}?.map((item: any) => ${renderSerializeValue(type.element, "item")}).join(",")`;
    case "literal":
      return JSON.stringify(type.value);
    case "boolean":
    case "number":
    case "model":
    case "record":
    case "string":
    case "unknown":
      return valueExpression;
  }
}

function renderHelpers(operations: readonly ServerOperation[]): string {
  const helpers = getRequiredHelpers(operations);
  const lines = [
    `function deserializeString(value: string | string[] | undefined, wireName: string, required: boolean): string | undefined {`,
    `  const normalized = normalizeValue(value);`,
    `  if (required && normalized === undefined) {`,
    `    throw new TypeError(\`Required parameter \${wireName} was not provided\`);`,
    `  }`,
    `  return normalized;`,
    `}`,
  ];

  if (helpers.deserializeNumber) {
    lines.push(
      "",
      `function deserializeNumber(value: string | string[] | undefined, wireName: string, required: boolean): number | undefined {`,
      `  const normalized = deserializeString(value, wireName, required);`,
      `  return normalized === undefined ? undefined : Number(normalized);`,
      `}`,
    );
  }

  if (helpers.deserializeBoolean) {
    lines.push(
      "",
      `function deserializeBoolean(value: string | string[] | undefined, wireName: string, required: boolean): boolean | string | undefined {`,
      `  const normalized = deserializeString(value, wireName, required);`,
      `  if (normalized === undefined) return undefined;`,
      `  return normalized === "true" ? true : normalized === "false" ? false : normalized;`,
      `}`,
    );
  }

  if (helpers.deserializeLiteral) {
    lines.push(
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
  }

  if (helpers.deserializeArray) {
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
    );
  }

  lines.push(
    "",
    `function normalizeValue(value: string | string[] | undefined): string | undefined {`,
    `  return Array.isArray(value) ? value.join(",") : value;`,
    `}`,
  );

  if (helpers.getHeaderCollection) {
    lines.push(
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
    );
  }

  lines.push(
    "",
    `function setHeader(res: IResponse, name: string, value: string | number | boolean | undefined): void {`,
    `  if (value !== undefined) {`,
    `    res.setHeader(name, value);`,
    `  }`,
    `}`,
  );

  if (helpers.setHeaderCollection) {
    lines.push(
      "",
      `function setHeaderCollection(res: IResponse, prefix: string, value: Record<string, unknown> | undefined): void {`,
      `  if (value === undefined) return;`,
      `  for (const [suffix, itemValue] of Object.entries(value)) {`,
      `    if (itemValue !== undefined) {`,
      `      res.setHeader(\`\${prefix}\${suffix}\`, String(itemValue));`,
      `    }`,
      `  }`,
      `}`,
    );
  }

  if (helpers.serializeDateTime) {
    lines.push(
      "",
      `function serializeDateTime(value: unknown): string | undefined {`,
      `  if (value === undefined) return undefined;`,
      `  return value instanceof Date ? value.toUTCString() : String(value);`,
      `}`,
    );
  }

  lines.push(
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
  );

  return lines.join("\n");
}

function getRequiredHelpers(operations: readonly ServerOperation[]): {
  deserializeNumber: boolean;
  deserializeBoolean: boolean;
  deserializeLiteral: boolean;
  deserializeArray: boolean;
  getHeaderCollection: boolean;
  setHeaderCollection: boolean;
  serializeDateTime: boolean;
} {
  const parameterTypes: ServerTypeRef[] = [];
  const responseHeaders: ServerResponseHeader[] = [];
  let getHeaderCollection = false;
  let setHeaderCollection = false;

  for (const op of operations) {
    parameterTypes.push(
      ...op.literalQueryParameters.map((p) => ({ kind: "literal" as const, value: p.value })),
    );
    for (const param of op.parameters.filter(
      (p) => p.location === "query" || p.location === "header",
    )) {
      parameterTypes.push(param.type);
      if (param.location === "header" && getHeaderCollectionPrefix(param.wireName) !== undefined) {
        getHeaderCollection = true;
      }
    }
    for (const response of op.responses) {
      responseHeaders.push(...response.headers);
      if (
        response.headers.some((header) => getHeaderCollectionPrefix(header.wireName) !== undefined)
      ) {
        setHeaderCollection = true;
      }
    }
  }

  return {
    deserializeNumber: parameterTypes.some((type) => containsTypeKind(type, "number")),
    deserializeBoolean: parameterTypes.some((type) => containsTypeKind(type, "boolean")),
    deserializeLiteral: parameterTypes.some((type) => type.kind === "literal"),
    deserializeArray: parameterTypes.some((type) => type.kind === "array"),
    getHeaderCollection,
    setHeaderCollection,
    serializeDateTime: responseHeaders.some((header) => containsTypeKind(header.type, "datetime")),
  };
}

function containsTypeKind(type: ServerTypeRef, kind: ServerTypeRef["kind"]): boolean {
  if (type.kind === kind) return true;
  if (type.kind === "array" || type.kind === "record") return containsTypeKind(type.element, kind);
  return false;
}

function getFunctionSuffix(op: ServerOperation): string {
  return op.name.replace(/[^A-Za-z0-9_$]/g, "_");
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

function indent(lines: readonly string[], spaces: number): string[] {
  const prefix = " ".repeat(spaces);
  return lines.map((line) => `${prefix}${line}`);
}
