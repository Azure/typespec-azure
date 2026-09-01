import { type Document, isScalar, LineCounter, parse, parseDocument, Scalar } from "yaml";
import type { ServiceVersions } from "./types.js";

/** A parsed `examples.yaml` (or `examples/<Interface>.yaml`) file with location metadata. */
export interface LoadedExampleFile {
  /** Absolute or repo-relative path, used verbatim in diagnostics. */
  readonly path: string;
  /** Raw file content. */
  readonly content: string;
  /** The parsed YAML document (retains node ranges for precise locations). */
  readonly document: Document.Parsed;
  /** Plain-JS view of the document (`undefined` if the YAML could not be materialized). */
  readonly data: any;
  /** Line counter for translating byte offsets to line/column. */
  readonly lineCounter: LineCounter;
  /** Fatal YAML parse error, if any. */
  readonly parseError?: string;
}

/** Parse a single examples file into a {@link LoadedExampleFile}. Never throws. */
export function loadExampleFile(path: string, content: string): LoadedExampleFile {
  const lineCounter = new LineCounter();
  const document = parseDocument(content, { lineCounter });
  const fatal = document.errors[0];
  let data: any;
  if (!fatal) {
    try {
      data = document.toJS();
    } catch {
      data = undefined;
    }
  }
  return {
    path,
    content,
    document,
    data,
    lineCounter,
    parseError: fatal?.message,
  };
}

/** 1-based line/column position. */
export interface Position {
  readonly line: number;
  readonly col: number;
}

/** Translate a byte offset into a 1-based line/column position. */
export function positionAt(
  file: LoadedExampleFile,
  offset: number | undefined,
): Position | undefined {
  if (offset === undefined) return undefined;
  const pos = file.lineCounter.linePos(offset);
  return { line: pos.line, col: pos.col };
}

/** Get the YAML node at a JSON path, or `undefined` if it doesn't exist. */
export function nodeAt(file: LoadedExampleFile, path: (string | number)[]): unknown {
  return file.document.getIn(path, true);
}

/** Position of the node at a JSON path (start of its value). */
export function locationAt(
  file: LoadedExampleFile,
  path: (string | number)[],
): Position | undefined {
  const node = nodeAt(file, path);
  const range = (node as { range?: [number, number, number] } | undefined)?.range;
  return positionAt(file, range?.[0]);
}

/**
 * Whether the scalar at the given path was written as a quoted string in the source.
 * Returns `false` for plain (unquoted) scalars, which YAML may coerce away from a string.
 */
export function isQuotedScalar(file: LoadedExampleFile, path: (string | number)[]): boolean {
  const node = nodeAt(file, path);
  if (!isScalar(node)) return false;
  return node.type === Scalar.QUOTE_SINGLE || node.type === Scalar.QUOTE_DOUBLE;
}

/**
 * Parse the version list from a `service.yaml` document. Tolerates a missing/empty
 * `versions` list and non-string entries.
 */
export function parseServiceVersions(content: string): ServiceVersions {
  let doc: any;
  try {
    doc = parse(content);
  } catch {
    return { versions: [] };
  }
  const raw = Array.isArray(doc?.versions) ? doc.versions : [];
  const versions = raw
    .map((entry: any) => entry?.version)
    .filter((version: unknown): version is string => typeof version === "string");
  return { versions };
}
