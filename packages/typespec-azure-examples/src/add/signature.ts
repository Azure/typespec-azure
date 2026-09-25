/**
 * Extract a comparable *signature* for every operation in a Swagger document: the resolved schema
 * of its parameters, request body, and responses. Signatures are compared across API versions (see
 * `./diff.ts`) to decide, with parity to OpenAPI-diff (oad), whether an operation changed and
 * therefore needs a fresh example for the new version.
 */

import { HTTP_METHODS } from "../migrate/swagger-types.js";

/** A resolved, comparison-ready signature for a single Swagger operation. */
export interface OperationSignature {
  readonly operationId: string;
  /** Non-body parameters keyed by name → `{ in, required, schema }` with `$ref`s inlined. */
  readonly parameters: Record<string, unknown>;
  /** The resolved request body schema, when the operation has a body parameter. */
  readonly body?: unknown;
  /** Response status code → `{ body, headers? }` with `$ref`s inlined (absent body is `null`). */
  readonly responses: Record<string, unknown>;
}

type AnyRecord = Record<string, any>;

const DEFINITION_REF = /^#\/definitions\/(.+)$/;
const PARAMETER_REF = /^#\/parameters\/(.+)$/;

/** Extract one {@link OperationSignature} per `operationId` in the document. */
export function extractOperationSignatures(doc: AnyRecord): Map<string, OperationSignature> {
  const signatures = new Map<string, OperationSignature>();
  const definitions: AnyRecord = doc.definitions ?? {};
  const sharedParameters: AnyRecord = doc.parameters ?? {};

  for (const pathItem of Object.values(doc.paths ?? {}) as AnyRecord[]) {
    if (pathItem === null || typeof pathItem !== "object") continue;
    const pathParameters = Array.isArray(pathItem.parameters) ? pathItem.parameters : [];

    for (const method of HTTP_METHODS) {
      const operation = pathItem[method] as AnyRecord | undefined;
      if (operation === undefined || typeof operation !== "object") continue;
      const operationId = operation.operationId;
      if (typeof operationId !== "string") continue;

      const rawParameters = [
        ...pathParameters,
        ...(Array.isArray(operation.parameters) ? operation.parameters : []),
      ].map((param) => resolveParameterRef(param, sharedParameters));

      const parameters: Record<string, unknown> = {};
      let body: unknown;
      for (const param of rawParameters) {
        if (param === undefined || typeof param.name !== "string") continue;
        if (param.in === "body") {
          body = resolveRefs(param.schema, definitions, new Set());
        } else {
          // Swagger 2.0 puts primitive parameter typing directly on the parameter object.
          const { name: _name, in: _in, description: _description, ...schema } = param;
          parameters[param.name] = {
            in: param.in,
            required: param.required ?? false,
            schema: resolveRefs(schema, definitions, new Set()),
          };
        }
      }

      const responses: Record<string, unknown> = {};
      for (const [code, response] of Object.entries(operation.responses ?? {})) {
        const raw = response as AnyRecord | null;
        const body =
          raw?.schema === undefined ? null : resolveRefs(raw.schema, definitions, new Set());
        // Response headers are part of the contract and are emitted in unified examples, so a change
        // to them (e.g. adding `Location`) must count as a change.
        const headers =
          raw?.headers === undefined ? undefined : resolveRefs(raw.headers, definitions, new Set());
        responses[code] = headers === undefined ? { body } : { body, headers };
      }

      signatures.set(operationId, { operationId, parameters, body, responses });
    }
  }

  return signatures;
}

/** Resolve a `#/parameters/<name>` reference against the document's shared parameter map. */
function resolveParameterRef(param: AnyRecord, shared: AnyRecord): AnyRecord | undefined {
  if (param === null || typeof param !== "object") return undefined;
  if (typeof param.$ref !== "string") return param;
  const match = PARAMETER_REF.exec(param.$ref);
  if (!match) return param;
  return shared[decodeURIComponent(match[1])];
}

/**
 * Recursively inline local `#/definitions/<name>` `$ref`s so two versions are compared by their
 * actual shape, not by ref identity. Cycles are broken by replacing a repeated reference with a
 * `{ $circularRef }` marker, which keeps the comparison finite while still reflecting the cycle.
 */
function resolveRefs(node: unknown, definitions: AnyRecord, seen: ReadonlySet<string>): unknown {
  if (Array.isArray(node)) {
    return node.map((item) => resolveRefs(item, definitions, seen));
  }
  if (node === null || typeof node !== "object") {
    return node;
  }

  const record = node as AnyRecord;
  if (typeof record.$ref === "string") {
    const match = DEFINITION_REF.exec(record.$ref);
    if (match) {
      const name = decodeURIComponent(match[1]);
      if (seen.has(name)) return { $circularRef: name };
      const target = definitions[name];
      if (target === undefined) return { $unresolvedRef: name };
      return resolveRefs(target, definitions, new Set(seen).add(name));
    }
  }

  const out: AnyRecord = {};
  for (const [key, value] of Object.entries(record)) {
    out[key] = resolveRefs(value, definitions, seen);
  }
  return out;
}
