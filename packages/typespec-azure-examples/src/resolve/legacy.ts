/**
 * Materialize resolved unified examples into classic `x-ms-examples` documents for a target API
 * version. This is the standalone counterpart to what the `typespec-autorest` emitter does inline:
 * it reads the service's Swagger for the operation metadata the unified format intentionally drops
 * (the `operationId` and the request-body parameter name), then reconstructs each legacy document via
 * {@link materializeLegacyExample}, keyed by its original (or conventional) file name.
 */

import { readFile } from "fs/promises";
import { materializeLegacyExample } from "../legacy.js";
import { deriveOperationKey } from "../migrate/operation-key.js";
import { HTTP_METHODS, type ParameterLocation } from "../migrate/swagger-types.js";
import { collectParamLocations, discoverSwaggerFiles } from "../migrate/swagger.js";
import { defaultLegacyExampleFilename, stripJsonExtension } from "../naming.js";
import type { ExampleDiagnostic } from "../types.js";
import { resolveExamplesDir } from "./resolve-dir.js";

/** A materialized legacy example: the classic `x-ms-examples` document and its file name. */
export interface LegacyExampleFile {
  readonly fileName: string;
  readonly document: unknown;
}

/** The outcome of resolving a service's examples into legacy documents for a version. */
export interface ResolveLegacyResult {
  readonly apiVersion: string;
  readonly files: LegacyExampleFile[];
  readonly diagnostics: ExampleDiagnostic[];
}

interface OperationMetadata {
  readonly operationId: string;
  readonly bodyParameterName?: string;
}

/**
 * Resolve the unified examples in `dir` for `apiVersion` and reconstruct the classic `x-ms-examples`
 * documents. Operations without matching Swagger metadata are reported and skipped.
 */
export async function resolveLegacyExamples(
  dir: string,
  apiVersion: string,
): Promise<ResolveLegacyResult> {
  const resolved = await resolveExamplesDir(dir, apiVersion);
  const diagnostics = [...resolved.diagnostics];
  const metadata = await crawlOperationMetadata(dir);

  const usedNames = new Set<string>();
  const files: LegacyExampleFile[] = [];
  for (const example of resolved.examples) {
    const meta = metadata.get(example.operation);
    if (meta === undefined) {
      diagnostics.push({
        code: "missing-operation-metadata",
        message: `No Swagger operation found for "${example.operation}"; cannot materialize a legacy example.`,
        severity: "warning",
        file: "examples.yaml",
      });
      continue;
    }
    const document = materializeLegacyExample(example, {
      operationId: meta.operationId,
      apiVersion,
      bodyParameterName: meta.bodyParameterName,
    });
    const base = stripJsonExtension(
      example.legacyFilename ?? defaultLegacyExampleFilename(meta.operationId, example.title),
    );
    files.push({ fileName: uniqueFileName(base, usedNames), document });
  }

  return { apiVersion: resolved.apiVersion, files, diagnostics };
}

/** Build a map of unified operation key → `{ operationId, bodyParameterName }` from the Swagger. */
async function crawlOperationMetadata(dir: string): Promise<Map<string, OperationMetadata>> {
  const map = new Map<string, OperationMetadata>();
  for (const file of await discoverSwaggerFiles(dir)) {
    let doc: any;
    try {
      doc = JSON.parse(await readFile(file, "utf-8"));
    } catch {
      continue;
    }
    for (const pathItem of Object.values(doc.paths ?? {}) as any[]) {
      if (pathItem === null || typeof pathItem !== "object") continue;
      for (const method of HTTP_METHODS) {
        const operation = pathItem[method];
        if (operation === undefined || typeof operation.operationId !== "string") continue;
        const locations = collectParamLocations(doc, [
          ...(pathItem.parameters ?? []),
          ...(operation.parameters ?? []),
        ]);
        map.set(deriveOperationKey(operation.operationId), {
          operationId: operation.operationId,
          bodyParameterName: bodyParameterName(locations),
        });
      }
    }
  }
  return map;
}

function bodyParameterName(locations: ReadonlyMap<string, ParameterLocation>): string | undefined {
  for (const [name, location] of locations) {
    if (location === "body") return name;
  }
  return undefined;
}

/** Disambiguate a base file name (without extension) against those already used. */
function uniqueFileName(base: string, used: Set<string>): string {
  let name = base;
  let index = 2;
  while (used.has(name)) name = `${base}_${index++}`;
  used.add(name);
  return `${name}.json`;
}
