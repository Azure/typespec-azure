/**
 * Extract a comparable *signature* for every operation in a Swagger document: the resolved schema
 * of its parameters, request body, and responses. Signatures are compared across API versions (see
 * `./diff.ts`) to decide, with parity to OpenAPI-diff (oad), whether an operation changed and
 * therefore needs a fresh example for the new version.
 *
 * `$ref`s are inlined — including **cross-file** refs (`models.json#/...`, common-types) resolved
 * relative to the referring document — so a change inside a referenced model counts as a change even
 * when the ref string is unchanged. Doc-only annotations (`description`, `title`, `example`, ...) are
 * dropped and set-valued arrays (`required`, `enum`) are order-normalized so purely cosmetic edits
 * do not produce spurious example churn.
 */

import { readFile } from "fs/promises";
import { dirname, isAbsolute, resolve as resolvePath } from "path";
import { HTTP_METHODS } from "../migrate/swagger-types.js";

/** A resolved, comparison-ready signature for a single Swagger operation. */
export interface OperationSignature {
  readonly operationId: string;
  /** Non-body parameters keyed by `"<in> <name>"` → `{ name, in, required, schema }`. */
  readonly parameters: Record<string, ParameterSignature>;
  /** The resolved request body schema, when the operation has a body parameter. */
  readonly body?: unknown;
  /** Response status code → `{ body, headers? }` with `$ref`s inlined (absent body is `null`). */
  readonly responses: Record<string, unknown>;
}

/** A single non-body parameter's resolved shape. */
export interface ParameterSignature {
  readonly name: string;
  readonly in?: string;
  readonly required: boolean;
  readonly schema: unknown;
}

type AnyRecord = Record<string, any>;

/** Loads and parses a referenced Swagger/JSON document by absolute path (cached). */
export type DocLoader = (absolutePath: string) => Promise<AnyRecord | undefined>;

/** Doc-only keys dropped from resolved schemas so cosmetic edits are not treated as changes. */
const ANNOTATION_KEYS = new Set(["description", "title", "summary", "example", "externalDocs"]);
/** Set-valued schema keys whose member order is not significant. */
const SET_ARRAYS = new Set(["required", "enum"]);

interface ResolveContext {
  readonly doc: AnyRecord;
  readonly baseDir?: string;
  readonly loader?: DocLoader;
}

/** Create a caching {@link DocLoader} backed by the filesystem. */
export function createDocLoader(): DocLoader {
  const cache = new Map<string, Promise<AnyRecord | undefined>>();
  return (absolutePath) => {
    let pending = cache.get(absolutePath);
    if (pending === undefined) {
      pending = readFile(absolutePath, "utf-8")
        .then((text) => JSON.parse(text) as AnyRecord)
        .catch(() => undefined);
      cache.set(absolutePath, pending);
    }
    return pending;
  };
}

/**
 * Extract one {@link OperationSignature} per `operationId` in the document. When `docPath` and a
 * `readDoc` loader are supplied, cross-file `$ref`s are resolved relative to `docPath`; otherwise an
 * external ref is kept as an opaque `{ $externalRef }` marker (so a ref-string change is still seen,
 * but a change inside the external model is not).
 */
export async function extractOperationSignatures(
  doc: AnyRecord,
  options: { docPath?: string; readDoc?: DocLoader } = {},
): Promise<Map<string, OperationSignature>> {
  const signatures = new Map<string, OperationSignature>();
  const baseDir = options.docPath ? dirname(options.docPath) : undefined;
  const rootCtx: ResolveContext = { doc, baseDir, loader: options.readDoc };

  for (const pathItem of Object.values(doc.paths ?? {}) as AnyRecord[]) {
    if (pathItem === null || typeof pathItem !== "object") continue;
    const pathParameters = Array.isArray(pathItem.parameters) ? pathItem.parameters : [];

    for (const method of HTTP_METHODS) {
      const operation = pathItem[method] as AnyRecord | undefined;
      if (operation === undefined || typeof operation !== "object") continue;
      const operationId = operation.operationId;
      if (typeof operationId !== "string") continue;

      const rawParameters = await Promise.all(
        [
          ...pathParameters,
          ...(Array.isArray(operation.parameters) ? operation.parameters : []),
        ].map((param) => resolveParameter(param, rootCtx)),
      );

      const parameters: Record<string, ParameterSignature> = {};
      let body: unknown;
      for (const param of rawParameters) {
        if (param === undefined || typeof param.value?.name !== "string") continue;
        const raw = param.value;
        if (raw.in === "body") {
          body = await resolveRefs(raw.schema, param.ctx, new Set());
        } else {
          // Swagger 2.0 puts primitive parameter typing directly on the parameter object.
          const {
            name: _name,
            in: _in,
            description: _description,
            required: _required,
            ...schema
          } = raw;
          // Key by name AND location so a query param and a header of the same name don't collide.
          parameters[`${raw.in ?? "query"} ${raw.name}`] = {
            name: raw.name,
            in: raw.in,
            required: raw.required ?? false,
            schema: await resolveRefs(schema, param.ctx, new Set()),
          };
        }
      }

      const responses: Record<string, unknown> = {};
      for (const [code, response] of Object.entries(operation.responses ?? {})) {
        const raw = response as AnyRecord | null;
        const bodySchema =
          raw?.schema === undefined ? null : await resolveRefs(raw.schema, rootCtx, new Set());
        // Response headers are part of the contract and are emitted in unified examples, so a change
        // to them (e.g. adding `Location`) must count as a change.
        const headers =
          raw?.headers === undefined
            ? undefined
            : await resolveRefs(raw.headers, rootCtx, new Set());
        responses[code] =
          headers === undefined ? { body: bodySchema } : { body: bodySchema, headers };
      }

      signatures.set(operationId, { operationId, parameters, body, responses });
    }
  }

  return signatures;
}

/** Resolve a parameter that may be a `$ref` (local or cross-file) to its object + resolve context. */
async function resolveParameter(
  param: AnyRecord,
  ctx: ResolveContext,
): Promise<{ value: AnyRecord; ctx: ResolveContext } | undefined> {
  if (param === null || typeof param !== "object") return undefined;
  if (typeof param.$ref !== "string") return { value: param, ctx };
  const target = await lookupRef(param.$ref, ctx);
  if (target === undefined) return { value: param, ctx };
  return { value: target.node as AnyRecord, ctx: target.ctx };
}

/**
 * Recursively inline `$ref`s (local and cross-file), drop doc-only annotations, and order-normalize
 * set-valued arrays. Cycles are broken by tracking the set of target nodes currently being resolved.
 */
async function resolveRefs(
  node: unknown,
  ctx: ResolveContext,
  seen: ReadonlySet<object>,
): Promise<unknown> {
  if (Array.isArray(node)) {
    return Promise.all(node.map((item) => resolveRefs(item, ctx, seen)));
  }
  if (node === null || typeof node !== "object") {
    return node;
  }

  const record = node as AnyRecord;
  if (typeof record.$ref === "string") {
    const target = await lookupRef(record.$ref, ctx);
    if (target === undefined) {
      return isExternalRef(record.$ref)
        ? { $externalRef: record.$ref }
        : { $unresolvedRef: record.$ref };
    }
    if (typeof target.node === "object" && target.node !== null && seen.has(target.node)) {
      return { $circularRef: record.$ref };
    }
    const nextSeen = new Set(seen);
    if (typeof target.node === "object" && target.node !== null) nextSeen.add(target.node);
    return resolveRefs(target.node, target.ctx, nextSeen);
  }

  const out: AnyRecord = {};
  for (const [key, value] of Object.entries(record)) {
    if (ANNOTATION_KEYS.has(key)) continue;
    if (SET_ARRAYS.has(key) && Array.isArray(value)) {
      out[key] = [...value].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
      continue;
    }
    out[key] = await resolveRefs(value, ctx, seen);
  }
  return out;
}

/** Resolve a `$ref` (local `#/...` or cross-file `file#/...`) to its target node and new context. */
async function lookupRef(
  ref: string,
  ctx: ResolveContext,
): Promise<{ node: unknown; ctx: ResolveContext } | undefined> {
  const hash = ref.indexOf("#");
  const filePart = hash < 0 ? ref : ref.slice(0, hash);
  const pointer = hash < 0 ? "" : ref.slice(hash + 1);

  if (filePart === "") {
    const node = resolvePointer(ctx.doc, pointer);
    return node === undefined ? undefined : { node, ctx };
  }

  if (ctx.loader === undefined || ctx.baseDir === undefined) return undefined;
  const absolutePath = isAbsolute(filePart) ? filePart : resolvePath(ctx.baseDir, filePart);
  const targetDoc = await ctx.loader(absolutePath);
  if (targetDoc === undefined) return undefined;
  const node = resolvePointer(targetDoc, pointer);
  if (node === undefined) return undefined;
  return { node, ctx: { doc: targetDoc, baseDir: dirname(absolutePath), loader: ctx.loader } };
}

/** Walk a JSON Pointer (`/a/b`) into a document. */
function resolvePointer(doc: AnyRecord, pointer: string): unknown {
  if (pointer === "" || pointer === "/") return doc;
  const parts = pointer
    .replace(/^\//, "")
    .split("/")
    .map((p) => p.replace(/~1/g, "/").replace(/~0/g, "~"));
  let current: unknown = doc;
  for (const part of parts) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as AnyRecord)[decodeURIComponent(part)];
  }
  return current;
}

function isExternalRef(ref: string): boolean {
  return !ref.startsWith("#");
}
