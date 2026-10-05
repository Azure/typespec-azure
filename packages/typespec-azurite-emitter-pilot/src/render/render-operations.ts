import type { ServerModel, ServerOperation, ServerResponse } from "../model.js";
import { renderFileHeader, renderTypeRef } from "./type-ref.js";

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

/**
 * Runtime route-binding metadata consumed by a dispatcher. Mirrors the information Azurite's
 * real generated dispatcher (`src/queue/generated/middleware/dispatch.middleware.ts`) reads off
 * its AutoRest-generated `msRest.OperationSpec`s: HTTP method, URL path template, and for each
 * parameter the wire name, location, and whether it is required (Azurite's dispatcher uses
 * `required` parameters to disambiguate between operations that share a path/verb, e.g. a
 * `SetMetadata` request vs. a plain `Create` request - see `isRequestAgainstOperation` in that
 * file).
 */
function renderMetadataConst(serverModel: ServerModel): string {
  const lines = [
    `export interface OperationParameterBinding {`,
    `  readonly name: string;`,
    `  readonly wireName: string;`,
    `  readonly location: "path" | "query" | "header";`,
    `  readonly required: boolean;`,
    `}`,
    "",
    `export interface OperationResponseMetadata {`,
    `  readonly statusCode: number | "*";`,
    `  readonly headerWireNames: readonly string[];`,
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
      lines.push(
        `      { statusCode: ${JSON.stringify(response.statusCode)}, headerWireNames: ${JSON.stringify(response.headers.map((h) => h.wireName))} },`,
      );
    }
    lines.push(`    ],`);
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
