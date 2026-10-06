import type {
  ServerModel,
  ServerOperation,
  ServerOperationParameter,
  ServerResponse,
  ServerResponseHeader,
  ServerTypeRef,
} from "../model.js";
import { renderFileHeader } from "./type-ref.js";

/**
 * Renders a small Azurite-compatible serialization metadata layer. This intentionally reuses
 * Azurite's existing ms-rest based serializer/deserializer helpers instead of introducing a new
 * runtime. For this phase, only operations whose successful responses have no body are marked
 * ready; more complex XML body mapping can be added incrementally.
 */
export function renderSerialization(serverModel: ServerModel): string {
  const supportedOperations = serverModel.operations.filter(isSerializationReady);
  const lines = [
    renderFileHeader(),
    `import * as msRest from "@azure/ms-rest-js";`,
    "",
    `const serializer = new msRest.Serializer({}, true);`,
    "",
  ];

  for (const op of supportedOperations) {
    lines.push(`const ${getSpecConstName(op)}: msRest.OperationSpec = {`);
    lines.push(`  httpMethod: ${JSON.stringify(op.verb.toUpperCase())},`);
    const path = renderOperationPath(op);
    if (path !== undefined) {
      lines.push(`  path: ${JSON.stringify(path)},`);
    }
    const queryParameters = renderQueryParameters(op);
    if (queryParameters.length > 0) {
      lines.push(`  queryParameters: [`);
      for (const parameter of queryParameters) {
        lines.push(...withTrailingComma(indent(parameter, 4)));
      }
      lines.push(`  ],`);
    }
    const headerParameters = renderHeaderParameters(op.parameters);
    if (headerParameters.length > 0) {
      lines.push(`  headerParameters: [`);
      for (const parameter of headerParameters) {
        lines.push(...withTrailingComma(indent(parameter, 4)));
      }
      lines.push(`  ],`);
    }
    lines.push(`  responses: {`);
    for (const response of op.responses) {
      lines.push(...indent(renderResponse(response, op), 4));
    }
    lines.push(`  },`);
    lines.push(`  isXML: true,`);
    lines.push(`  serializer,`);
    lines.push(`};`, "");
  }

  lines.push(
    `export const serializationOperationSpecs: ReadonlyMap<string, msRest.OperationSpec> = new Map([`,
  );
  for (const op of supportedOperations) {
    lines.push(`  [${JSON.stringify(op.name)}, ${getSpecConstName(op)}],`);
  }
  lines.push(`]);`, "");
  lines.push(
    `export function getSerializationOperationSpec(name: string): msRest.OperationSpec | undefined {`,
  );
  lines.push(`  return serializationOperationSpecs.get(name);`);
  lines.push(`}`, "");

  return lines.join("\n");
}

function isSerializationReady(op: ServerOperation): boolean {
  if (op.requestBody !== undefined) return false;
  return op.responses.every(
    (response) => response.statusCode === "*" || response.body === undefined,
  );
}

function getSpecConstName(op: ServerOperation): string {
  return `${op.name.replace(/[^A-Za-z0-9_$]/g, "_")}OperationSpec`;
}

function renderOperationPath(op: ServerOperation): string | undefined {
  if (!op.path || op.path === "/") return undefined;
  return op.path.startsWith("/") ? op.path.slice(1) : op.path;
}

function renderQueryParameters(op: ServerOperation): string[] {
  const parameters: string[] = [];
  for (const literal of op.literalQueryParameters) {
    parameters.push(
      renderParameter({
        parameterPath: literal.name,
        wireName: literal.name,
        type: { kind: "literal", value: literal.value },
        required: true,
      }),
    );
  }
  for (const param of op.parameters.filter((p) => p.location === "query")) {
    parameters.push(
      renderParameter({
        parameterPath: getParameterPath(param),
        wireName: param.wireName,
        type: param.type,
        required: !param.optional,
      }),
    );
  }
  return parameters;
}

function renderHeaderParameters(parameters: readonly ServerOperationParameter[]): string[] {
  return parameters
    .filter((p) => p.location === "header")
    .map((param) =>
      renderParameter({
        parameterPath: getParameterPath(param),
        wireName: param.wireName,
        type: param.type,
        required: !param.optional,
      }),
    );
}

function getParameterPath(param: ServerOperationParameter): string | readonly string[] {
  if (param.optional) return ["options", getHandlerParameterName(param)];
  return param.name;
}

function getHandlerParameterName(param: ServerOperationParameter): string {
  return param.wireName.toLowerCase() === "x-ms-client-request-id" ? "requestId" : param.name;
}

function renderParameter(input: {
  parameterPath: string | readonly string[];
  wireName: string;
  type: ServerTypeRef;
  required: boolean;
}): string {
  const lines = [`{`];
  lines.push(`  parameterPath: ${JSON.stringify(input.parameterPath)},`);
  lines.push(`  mapper: ${renderMapper(input.type, input.wireName, { required: input.required })}`);
  const collectionFormat = getCollectionFormat(input.type);
  if (collectionFormat !== undefined) {
    lines.push(`,`);
    lines.push(`  collectionFormat: ${collectionFormat}`);
  }
  lines.push(`}`);
  return lines.join("\n");
}

function renderResponse(response: ServerResponse, op: ServerOperation): string {
  const responseKey = response.statusCode === "*" ? "default" : String(response.statusCode);
  const lines = [`${JSON.stringify(responseKey)}: {`];
  if (response.headers.length > 0) {
    lines.push(`  headersMapper: ${renderHeadersMapper(op, response)},`);
  }
  if (response.body && response.statusCode !== "*") {
    lines.push(
      `  bodyMapper: ${renderMapper(response.body.type, `${op.name}${responseKey}Body`)},`,
    );
  }
  lines.push(`},`);
  return lines.join("\n");
}

function renderHeadersMapper(op: ServerOperation, response: ServerResponse): string {
  const responseName = response.statusCode === "*" ? "Default" : response.statusCode;
  const lines = [`{`];
  lines.push(`  serializedName: ${JSON.stringify(`${op.name}${responseName}Headers`)},`);
  lines.push(`  type: {`);
  lines.push(`    name: "Composite",`);
  lines.push(`    className: ${JSON.stringify(`${op.name}${responseName}Headers`)},`);
  lines.push(`    modelProperties: {`);
  for (const header of response.headers) {
    lines.push(`      ${header.name}: ${renderHeaderMapper(header)},`);
  }
  lines.push(`    },`);
  lines.push(`  },`);
  lines.push(`}`);
  return lines.join("\n");
}

function renderHeaderMapper(header: ServerResponseHeader): string {
  return renderMapper(header.type, header.wireName, {
    headerCollectionPrefix: getHeaderCollectionPrefix(header.wireName),
  });
}

function renderMapper(
  type: ServerTypeRef,
  serializedName: string,
  options: {
    required?: boolean;
    headerCollectionPrefix?: string;
  } = {},
): string {
  const lines = [`{`];
  if (options.required) {
    lines.push(`  required: true,`);
  }
  if (type.kind === "literal") {
    lines.push(`  isConstant: true,`);
    lines.push(`  defaultValue: ${JSON.stringify(type.value)},`);
  }
  lines.push(`  serializedName: ${JSON.stringify(serializedName)},`);
  const headerCollectionPrefix =
    options.headerCollectionPrefix ?? getHeaderCollectionPrefix(serializedName);
  if (headerCollectionPrefix !== undefined) {
    lines.push(`  headerCollectionPrefix: ${JSON.stringify(headerCollectionPrefix)},`);
    lines.push(`  type: { name: "Dictionary", value: { type: { name: "String" } } },`);
    lines.push(`}`);
    return lines.join("\n");
  }
  lines.push(`  type: ${renderMapperType(type)},`);
  lines.push(`}`);
  return lines.join("\n");
}

function renderMapperType(type: ServerTypeRef): string {
  switch (type.kind) {
    case "number":
      return `{ name: "Number" }`;
    case "boolean":
      return `{ name: "Boolean" }`;
    case "datetime":
      return `{ name: "DateTimeRfc1123" }`;
    case "literal":
      if (typeof type.value === "number") return renderMapperType({ kind: "number" });
      if (typeof type.value === "boolean") return renderMapperType({ kind: "boolean" });
      return renderMapperType({ kind: "string" });
    case "array":
      return `{ name: "Sequence", element: { type: ${renderMapperType(type.element)} } }`;
    case "record":
      return `{ name: "Dictionary", value: { type: ${renderMapperType(type.element)} } }`;
    case "model":
      return `{ name: "Composite", className: ${JSON.stringify(type.name)} }`;
    case "string":
    case "unknown":
      return `{ name: "String" }`;
  }
}

function getHeaderCollectionPrefix(wireName: string): string | undefined {
  return wireName.toLowerCase() === "x-ms-meta" ? "x-ms-meta-" : undefined;
}

function getCollectionFormat(type: ServerTypeRef): string | undefined {
  return type.kind === "array" ? "msRest.QueryCollectionFormat.Csv" : undefined;
}

function indent(text: string, spaces: number): string[] {
  const prefix = " ".repeat(spaces);
  return text.split("\n").map((line) => `${prefix}${line}`);
}

function withTrailingComma(lines: string[]): string[] {
  if (lines.length === 0) return lines;
  const last = lines.length - 1;
  return [...lines.slice(0, last), `${lines[last]},`];
}
