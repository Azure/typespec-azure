import type { ServerModel, ServerOperation, ServerResponse } from "../model.js";
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
    `export interface OperationParameterBinding {`,
    `  readonly name: string;`,
    `  readonly wireName: string;`,
    `  readonly location: "path" | "query" | "header";`,
    `  readonly required: boolean;`,
    `}`,
    "",
    `export interface OperationResponseHeaderBinding {`,
    `  readonly name: string;`,
    `  readonly wireName: string;`,
    `}`,
    "",
    `export interface OperationResponseMetadata {`,
    `  readonly statusCode: number | "*";`,
    `  readonly headers: readonly OperationResponseHeaderBinding[];`,
    `}`,
    "",
    `export interface OperationMetadata {`,
    `  readonly name: string;`,
    `  readonly verb: string;`,
    `  readonly path: string;`,
    `  readonly parameters: readonly OperationParameterBinding[];`,
    `  readonly hasRequestBody: boolean;`,
    `  readonly requestBodyContentTypes: readonly string[];`,
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
    lines.push(`    path: ${JSON.stringify(op.path)},`);
    lines.push(`    parameters: [`);
    for (const param of op.parameters) {
      lines.push(
        `      { name: ${JSON.stringify(param.name)}, wireName: ${JSON.stringify(param.wireName)}, location: ${JSON.stringify(param.location)}, required: ${!param.optional} },`,
      );
    }
    lines.push(`    ],`);
    lines.push(`    hasRequestBody: ${op.requestBody !== undefined},`);
    lines.push(
      `    requestBodyContentTypes: ${JSON.stringify(op.requestBody?.contentTypes ?? [])},`,
    );
    lines.push(`    responses: [`);
    for (const response of op.responses) {
      const headerEntries = response.headers
        .map((h) => `{ name: ${JSON.stringify(h.name)}, wireName: ${JSON.stringify(h.wireName)} }`)
        .join(", ");
      lines.push(
        `      { statusCode: ${JSON.stringify(response.statusCode)}, headers: [${headerEntries}] },`,
      );
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
