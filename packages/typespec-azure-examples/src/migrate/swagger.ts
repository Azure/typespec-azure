import { readdir, readFile } from "fs/promises";
import { dirname, isAbsolute, join, resolve, sep } from "path";
import type {
  ParameterLocation,
  SwaggerDocument,
  SwaggerOperation,
  SwaggerParameter,
  XmsExampleDoc,
} from "./swagger-types.js";
import { HTTP_METHODS } from "./swagger-types.js";

/** An operation extracted from a Swagger document, with its parameter-location map. */
export interface ExtractedOperation {
  readonly operationId: string;
  readonly paramLocations: Map<string, ParameterLocation>;
  readonly examples: Record<string, { readonly $ref?: string }>;
}

/** One example, fully loaded and associated with an operation and API version. */
export interface CrawledExample {
  readonly operationId: string;
  readonly version: string;
  readonly exampleName: string;
  readonly doc: XmsExampleDoc;
  readonly paramLocations: Map<string, ParameterLocation>;
}

/** The full result of crawling a spec tree. */
export interface CrawlResult {
  readonly examples: CrawledExample[];
  readonly namespace?: string;
  readonly versions: string[];
}

/** Detect the resource-provider namespace from Swagger path templates (`/providers/<NS>/`). */
export function namespaceFromPaths(pathKeys: Iterable<string>): string | undefined {
  for (const path of pathKeys) {
    const match = /\/providers\/([^/{}]+)\//.exec(path);
    if (match) return match[1];
  }
  return undefined;
}

/** Resolve a local `#/parameters/<name>` reference against the document's parameter map. */
export function resolveLocalParam(
  doc: SwaggerDocument,
  parameter: SwaggerParameter,
): SwaggerParameter | undefined {
  if (parameter.$ref === undefined) return parameter;
  const match = /^#\/parameters\/(.+)$/.exec(parameter.$ref);
  if (!match) return undefined;
  return doc.parameters?.[decodeURIComponent(match[1])];
}

/** Build a parameter-name → location map from path-level and operation-level parameters. */
export function collectParamLocations(
  doc: SwaggerDocument,
  parameters: readonly SwaggerParameter[] | undefined,
): Map<string, ParameterLocation> {
  const map = new Map<string, ParameterLocation>();
  for (const raw of parameters ?? []) {
    const resolved = resolveLocalParam(doc, raw);
    if (resolved?.name !== undefined && resolved.in !== undefined) {
      map.set(resolved.name, resolved.in);
    }
  }
  return map;
}

/** Extract every operation that carries `x-ms-examples` from a parsed Swagger document. */
export function extractOperations(doc: SwaggerDocument): ExtractedOperation[] {
  const operations: ExtractedOperation[] = [];
  for (const pathItem of Object.values(doc.paths ?? {})) {
    const pathParams = pathItem.parameters;
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method] as SwaggerOperation | undefined;
      if (operation === undefined || typeof operation !== "object") continue;
      const examples = operation["x-ms-examples"];
      if (examples === undefined || operation.operationId === undefined) continue;

      const paramLocations = collectParamLocations(doc, [
        ...(pathParams ?? []),
        ...(operation.parameters ?? []),
      ]);
      operations.push({ operationId: operation.operationId, paramLocations, examples });
    }
  }
  return operations;
}

/**
 * Extract the API version from a Swagger file path: the path segment immediately following a
 * `stable` or `preview` segment (the Azure spec layout). Returns `undefined` when not found.
 */
export function versionFromPath(filePath: string): string | undefined {
  const segments = filePath.split(/[\\/]/);
  for (let i = 0; i < segments.length - 1; i++) {
    if (segments[i] === "stable" || segments[i] === "preview") {
      return segments[i + 1];
    }
  }
  return undefined;
}

/** Resolve an `x-ms-examples` `$ref` (relative file path with optional fragment) to a file path. */
export function resolveRefPath(fromFile: string, ref: string): string {
  const withoutFragment = ref.split("#")[0];
  if (isAbsolute(withoutFragment)) return withoutFragment;
  return resolve(dirname(fromFile), withoutFragment);
}

/**
 * Recursively discover Swagger documents under `root`. A file qualifies when its path contains a
 * `stable`/`preview` version segment and its content has a `paths` object (i.e. it is a service
 * spec, not an example JSON).
 */
export async function discoverSwaggerFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const full = join(entryDir(entry, root), entry.name);
    if (versionFromPath(full) === undefined) continue;
    if (full.split(sep).includes("examples")) continue;
    files.push(full);
  }
  return files.sort();
}

function entryDir(entry: { parentPath?: string; path?: string }, root: string): string {
  // Node's Dirent exposes `parentPath` (>=20.12) or the older `path`.
  return entry.parentPath ?? entry.path ?? root;
}

/** Crawl `root`, loading every `x-ms-examples` document for every versioned Swagger operation. */
export async function crawlExamples(root: string): Promise<CrawlResult> {
  const files = await discoverSwaggerFiles(root);
  const crawled: CrawledExample[] = [];
  const versions = new Set<string>();
  let namespace: string | undefined;

  for (const file of files) {
    let doc: SwaggerDocument;
    try {
      doc = JSON.parse(await readFile(file, "utf-8")) as SwaggerDocument;
    } catch {
      continue;
    }
    if (doc.paths === undefined) continue;
    const version = versionFromPath(file);
    if (version === undefined) continue;
    versions.add(version);
    namespace ??= namespaceFromPaths(Object.keys(doc.paths));

    for (const operation of extractOperations(doc)) {
      for (const [exampleName, entry] of Object.entries(operation.examples)) {
        if (entry?.$ref === undefined) continue;
        const examplePath = resolveRefPath(file, entry.$ref);
        let exampleDoc: XmsExampleDoc;
        try {
          exampleDoc = JSON.parse(await readFile(examplePath, "utf-8")) as XmsExampleDoc;
        } catch {
          continue;
        }
        crawled.push({
          operationId: operation.operationId,
          version,
          exampleName,
          doc: exampleDoc,
          paramLocations: operation.paramLocations,
        });
      }
    }
  }

  return { examples: crawled, namespace, versions: [...versions] };
}
