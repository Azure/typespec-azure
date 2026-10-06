import type { ServerModel, ServerOperation, ServerResponse, ServerTypeRef } from "../model.js";
import { collectModelRefs, renderFileHeader, renderTypeRef } from "./type-ref.js";

/** Collects every `models.ts`-defined type name referenced anywhere in `serverModel`'s operations. */
function collectReferencedModelNames(serverModel: ServerModel): string[] {
  const names = new Set<string>();
  for (const op of serverModel.operations) {
    for (const param of op.parameters) {
      collectModelRefs(param.type, names);
    }
    if (op.requestBody) {
      collectModelRefs(op.requestBody.type, names);
    }
    for (const response of op.responses) {
      for (const header of response.headers) {
        collectModelRefs(header.type, names);
      }
      if (response.body) {
        collectModelRefs(response.body.type, names);
      }
    }
  }
  return [...names].sort();
}

function renderParametersInterface(op: ServerOperation): string {
  const lines = [`export interface ${op.name}Parameters {`];
  for (const param of op.parameters) {
    lines.push(`  ${param.name}${param.optional ? "?" : ""}: ${renderTypeRef(param.type)};`);
  }
  if (op.requestBody) {
    lines.push(`  body: ${renderTypeRef(op.requestBody.type)};`);
  }
  lines.push(`}`, "");
  return lines.join("\n");
}

function renderResponseVariant(response: ServerResponse): string {
  const lines = [`  | {`];
  lines.push(`      statusCode: ${response.statusCode === "*" ? "number" : response.statusCode};`);
  if (response.headers.length > 0) {
    lines.push(`      headers: {`);
    for (const header of response.headers) {
      lines.push(
        `        ${header.name}${header.optional ? "?" : ""}: ${renderTypeRef(header.type)};`,
      );
    }
    lines.push(`      };`);
  }
  if (response.body) {
    lines.push(`      body: ${renderTypeRef(response.body.type)};`);
  }
  lines.push(`    }`);
  return lines.join("\n");
}

function renderResponseType(op: ServerOperation): string {
  const lines = [`export type ${op.name}Response =`];
  for (const response of op.responses) {
    lines.push(renderResponseVariant(response));
  }
  lines.push(`;`, "");
  return lines.join("\n");
}

function renderMetadataConst(serverModel: ServerModel): string {
  const lines = [
    `export type OperationTypeBinding =`,
    `  | { readonly kind: "string" | "number" | "boolean" | "datetime" | "record" | "unknown" }`,
    `  | { readonly kind: "model"; readonly name: string }`,
    `  | { readonly kind: "literal"; readonly value: string | number | boolean }`,
    `  | { readonly kind: "array"; readonly element: OperationTypeBinding };`,
    "",
    `export interface OperationParameterBinding {`,
    `  readonly name: string;`,
    `  readonly wireName: string;`,
    `  readonly location: "path" | "query" | "header";`,
    `  readonly required: boolean;`,
    `  readonly type: OperationTypeBinding;`,
    `}`,
    "",
    `export interface OperationResponseHeaderBinding {`,
    `  readonly name: string;`,
    `  readonly wireName: string;`,
    `  readonly type: OperationTypeBinding;`,
    `}`,
    "",
    `export interface OperationResponseMetadata {`,
    `  readonly statusCode: number | "*";`,
    `  readonly headers: readonly OperationResponseHeaderBinding[];`,
    `  readonly body?: { readonly type: OperationTypeBinding };`,
    `}`,
    "",
    `export interface OperationLiteralQueryParameter {`,
    `  readonly name: string;`,
    `  readonly value: string;`,
    `}`,
    "",
    `export interface OperationMetadata {`,
    `  readonly name: string;`,
    `  readonly verb: string;`,
    `  readonly rawPath: string;`,
    `  readonly path: string;`,
    `  readonly literalQueryParameters: readonly OperationLiteralQueryParameter[];`,
    `  readonly requiredQueryParameters: readonly string[];`,
    `  readonly requiredHeaderParameters: readonly string[];`,
    `  readonly parameters: readonly OperationParameterBinding[];`,
    `  readonly hasRequestBody: boolean;`,
    `  readonly requestBodyContentTypes: readonly string[];`,
    `  readonly requestBodyParameterPath?: string | readonly string[];`,
    `  readonly requestBodyType?: OperationTypeBinding;`,
    `  readonly responses: readonly OperationResponseMetadata[];`,
    `  readonly interfaceName?: string;`,
    `}`,
    "",
    `export const operations: readonly OperationMetadata[] = [`,
  ];
  for (const op of serverModel.operations) {
    lines.push(`  {`);
    lines.push(`    name: ${JSON.stringify(op.name)},`);
    lines.push(`    verb: ${JSON.stringify(op.verb)},`);
    lines.push(`    rawPath: ${JSON.stringify(op.rawPath)},`);
    lines.push(`    path: ${JSON.stringify(op.path)},`);
    lines.push(`    literalQueryParameters: ${JSON.stringify(op.literalQueryParameters)},`);
    lines.push(
      `    requiredQueryParameters: ${JSON.stringify(
        op.parameters.filter((p) => p.location === "query" && !p.optional).map((p) => p.wireName),
      )},`,
    );
    lines.push(
      `    requiredHeaderParameters: ${JSON.stringify(
        op.parameters.filter((p) => p.location === "header" && !p.optional).map((p) => p.wireName),
      )},`,
    );
    lines.push(`    parameters: [`);
    for (const param of op.parameters) {
      lines.push(
        `      { name: ${JSON.stringify(param.name)}, wireName: ${JSON.stringify(param.wireName)}, location: ${JSON.stringify(param.location)}, required: ${!param.optional}, type: ${renderOperationTypeBinding(param.type)} },`,
      );
    }
    lines.push(`    ],`);
    lines.push(`    hasRequestBody: ${op.requestBody !== undefined},`);
    lines.push(
      `    requestBodyContentTypes: ${JSON.stringify(op.requestBody?.contentTypes ?? [])},`,
    );
    if (op.requestBody) {
      lines.push(
        `    requestBodyParameterPath: ${renderParameterPath(op.requestBody.parameterPath)},`,
      );
      lines.push(`    requestBodyType: ${renderOperationTypeBinding(op.requestBody.type)},`);
    }
    lines.push(`    responses: [`);
    for (const response of op.responses) {
      const headerEntries = response.headers
        .map(
          (h) =>
            `{ name: ${JSON.stringify(h.name)}, wireName: ${JSON.stringify(h.wireName)}, type: ${renderOperationTypeBinding(h.type)} }`,
        )
        .join(", ");
      const bodyEntry = response.body
        ? `, body: { type: ${renderOperationTypeBinding(response.body.type)} }`
        : "";
      lines.push(
        `      { statusCode: ${JSON.stringify(response.statusCode)}, headers: [${headerEntries}]${bodyEntry} },`,
      );
    }

    function renderParameterPath(parameterPath: string | readonly string[]): string {
      return typeof parameterPath === "string"
        ? JSON.stringify(parameterPath)
        : `[${parameterPath.map((path) => JSON.stringify(path)).join(", ")}]`;
    }
    lines.push(`    ],`);
    if (op.interfaceName !== undefined) {
      lines.push(`    interfaceName: ${JSON.stringify(op.interfaceName)},`);
    }
    lines.push(`  },`);
  }
  lines.push(`];`, "");
  return lines.join("\n");
}

function renderOperationTypeBinding(type: ServerTypeRef): string {
  switch (type.kind) {
    case "array":
      return `{ kind: "array", element: ${renderOperationTypeBinding(type.element)} }`;
    case "literal":
      return `{ kind: "literal", value: ${JSON.stringify(type.value)} }`;
    case "model":
      return `{ kind: "model", name: ${JSON.stringify(type.name)} }`;
    case "record":
      return `{ kind: ${JSON.stringify(type.kind)} }`;
    case "boolean":
    case "datetime":
    case "number":
    case "string":
    case "unknown":
      return `{ kind: ${JSON.stringify(type.kind)} }`;
  }
}

/**
 * Renders the `operations.ts` artifact: per-operation request/response TS types plus a
 * runtime route-binding metadata table, analogous to Azurite's existing
 * `parameters.ts`/`operation.ts` generated boundary.
 */
export function renderOperations(serverModel: ServerModel): string {
  const parts: string[] = [renderFileHeader()];
  const referencedModels = collectReferencedModelNames(serverModel);
  if (referencedModels.length > 0) {
    parts.push(`import type { ${referencedModels.join(", ")} } from "./models.js";`, "");
  }
  for (const op of serverModel.operations) {
    if (op.doc) {
      parts.push(`/** ${op.doc} */`);
    }
    parts.push(renderParametersInterface(op));
    parts.push(renderResponseType(op));
  }
  parts.push(renderMetadataConst(serverModel));
  return parts.join("\n");
}
