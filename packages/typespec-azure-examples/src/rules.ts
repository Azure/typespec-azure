import { isQuotedScalar, locationAt, type LoadedExampleFile } from "./loader.js";
import type { ExampleDiagnostic } from "./types.js";

/** File-level metadata keys allowed to be `$`-prefixed. */
const METADATA_KEYS = new Set(["$schema", "$namespace"]);

/** Context available to the semantic rules. */
export interface SemanticContext {
  /**
   * API versions declared in the service's `service.yaml`. When `undefined`, the
   * `since ∈ service.yaml` check is skipped (e.g. no `service.yaml` was found).
   */
  readonly serviceVersions?: readonly string[];
}

/** Run all per-file semantic rules (RFC §3) against a single loaded file. */
export function checkSemantics(file: LoadedExampleFile, ctx: SemanticContext): ExampleDiagnostic[] {
  const diagnostics: ExampleDiagnostic[] = [];
  const data = file.data;
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return diagnostics;
  }

  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith("$")) {
      if (!METADATA_KEYS.has(key)) {
        diagnostics.push(
          diag(
            file,
            [key],
            "error",
            "unknown-metadata-key",
            () =>
              `Unknown file metadata key '${key}'. Only '$schema' and '$namespace' are allowed; bare keys are operations.`,
          ),
        );
      }
      continue;
    }

    // Bare top-level key => operation.
    if (!Array.isArray(value)) {
      diagnostics.push(
        diag(
          file,
          [key],
          "error",
          "operation-not-a-list",
          () => `Operation '${key}' must be a list of examples.`,
          key,
        ),
      );
      continue;
    }

    checkOperation(file, ctx, key, value, diagnostics);
  }

  return diagnostics;
}

function checkOperation(
  file: LoadedExampleFile,
  ctx: SemanticContext,
  operation: string,
  variants: unknown[],
  diagnostics: ExampleDiagnostic[],
): void {
  const lineages = new Map<string, { index: number; since?: string; hasSince: boolean }[]>();

  variants.forEach((variant, i) => {
    if (variant === null || typeof variant !== "object" || Array.isArray(variant)) {
      return;
    }
    const v = variant as Record<string, unknown>;

    checkResponses(file, operation, i, v.responses, diagnostics);
    checkSince(file, ctx, operation, i, v, diagnostics);
    checkExplicitApiVersion(file, operation, i, v.request, diagnostics);
    checkPlaceholders(file, operation, i, v, diagnostics);

    const title = typeof v.title === "string" ? v.title : "";
    const hasSince = typeof v.since === "string";
    const entry = { index: i, since: hasSince ? (v.since as string) : undefined, hasSince };
    const group = lineages.get(title);
    if (group) group.push(entry);
    else lineages.set(title, [entry]);
  });

  checkLineages(file, operation, lineages, diagnostics);
}

function checkResponses(
  file: LoadedExampleFile,
  operation: string,
  index: number,
  responses: unknown,
  diagnostics: ExampleDiagnostic[],
): void {
  if (responses === null || typeof responses !== "object" || Array.isArray(responses)) {
    return;
  }
  for (const code of Object.keys(responses as Record<string, unknown>)) {
    if (!/^\d+$/.test(code) || Number(code) < 100 || Number(code) > 599) {
      diagnostics.push(
        diag(
          file,
          [operation, index, "responses"],
          "error",
          "invalid-status-code",
          () =>
            `Response key '${code}' is not a valid integer status code. Range keys ('2XX') and 'default' are not permitted; use a concrete numeric status code.`,
          operation,
        ),
      );
    }
  }
}

function checkSince(
  file: LoadedExampleFile,
  ctx: SemanticContext,
  operation: string,
  index: number,
  variant: Record<string, unknown>,
  diagnostics: ExampleDiagnostic[],
): void {
  if (!("since" in variant)) return;
  const since = variant.since;
  if (typeof since !== "string") {
    diagnostics.push(
      diag(
        file,
        [operation, index, "since"],
        "error",
        "unquoted-since",
        () => `'since' must be a quoted version string (e.g. since: "2024-06-01").`,
        operation,
      ),
    );
    return;
  }
  if (!isQuotedScalar(file, [operation, index, "since"])) {
    diagnostics.push(
      diag(
        file,
        [operation, index, "since"],
        "error",
        "unquoted-since",
        () => `'since' must be quoted (since: "${since}") so YAML does not parse it as a date.`,
        operation,
      ),
    );
  }
  if (ctx.serviceVersions !== undefined && !ctx.serviceVersions.includes(since)) {
    diagnostics.push(
      diag(
        file,
        [operation, index, "since"],
        "error",
        "unknown-since-version",
        () => `'since' value "${since}" is not a version listed in service.yaml.`,
        operation,
      ),
    );
  }
}

function checkExplicitApiVersion(
  file: LoadedExampleFile,
  operation: string,
  index: number,
  request: unknown,
  diagnostics: ExampleDiagnostic[],
): void {
  if (request === null || typeof request !== "object" || Array.isArray(request)) return;
  const req = request as Record<string, unknown>;
  for (const location of ["path", "query"] as const) {
    const params = req[location];
    if (params === null || typeof params !== "object" || Array.isArray(params)) continue;
    for (const paramName of Object.keys(params as Record<string, unknown>)) {
      if (paramName.toLowerCase() === "api-version") {
        diagnostics.push(
          diag(
            file,
            [operation, index, "request", location],
            "error",
            "explicit-api-version",
            () =>
              `'api-version' must not be written as a request ${location} parameter; it is implicit and resolved from the version context.`,
            operation,
          ),
        );
      }
    }
  }
}

const PLACEHOLDER_RE = /\{([A-Za-z0-9._-]+)\}/g;

function checkPlaceholders(
  file: LoadedExampleFile,
  operation: string,
  index: number,
  variant: Record<string, unknown>,
  diagnostics: ExampleDiagnostic[],
): void {
  const offenders = new Set<string>();
  collectStrings(variant, (value) => {
    let match: RegExpExecArray | null;
    PLACEHOLDER_RE.lastIndex = 0;
    while ((match = PLACEHOLDER_RE.exec(value)) !== null) {
      if (match[1] !== "api-version") offenders.add(match[0]);
    }
  });
  if (offenders.size > 0) {
    diagnostics.push(
      diag(
        file,
        [operation, index],
        "error",
        "unsupported-placeholder",
        () =>
          `Unsupported placeholder(s) ${[...offenders].map((o) => `'${o}'`).join(", ")}. '{api-version}' is the only supported placeholder.`,
        operation,
      ),
    );
  }
}

function checkLineages(
  file: LoadedExampleFile,
  operation: string,
  lineages: Map<string, { index: number; since?: string; hasSince: boolean }[]>,
  diagnostics: ExampleDiagnostic[],
): void {
  for (const [title, entries] of lineages) {
    const label = title === "" ? "the default lineage" : `lineage '${title}'`;

    const baseEntries = entries.filter((e) => !e.hasSince);
    if (baseEntries.length > 1) {
      for (const extra of baseEntries.slice(1)) {
        diagnostics.push(
          diag(
            file,
            [operation, extra.index],
            "error",
            "multiple-base-variants",
            () =>
              `${capitalize(label)} of operation '${operation}' has more than one entry without 'since'; only one base entry is allowed.`,
            operation,
          ),
        );
      }
    }

    const seen = new Map<string, number>();
    for (const entry of entries) {
      if (entry.since === undefined) continue;
      if (seen.has(entry.since)) {
        diagnostics.push(
          diag(
            file,
            [operation, entry.index, "since"],
            "error",
            "duplicate-since",
            () =>
              `Duplicate 'since' value "${entry.since}" in ${label} of operation '${operation}'.`,
            operation,
          ),
        );
      } else {
        seen.set(entry.since, entry.index);
      }
    }
  }
}

/**
 * Cross-file placement rules (RFC §3.1): an operation's full example set lives in a single
 * file, and an interface appears in exactly one file.
 */
export function checkFilePlacement(files: LoadedExampleFile[]): ExampleDiagnostic[] {
  const diagnostics: ExampleDiagnostic[] = [];
  const operationFiles = new Map<string, string>();
  const interfaceFiles = new Map<string, string>();

  for (const file of files) {
    const data = file.data;
    if (data === null || typeof data !== "object" || Array.isArray(data)) continue;

    for (const key of Object.keys(data)) {
      if (key.startsWith("$")) continue;

      const firstFile = operationFiles.get(key);
      if (firstFile !== undefined && firstFile !== file.path) {
        diagnostics.push(
          diag(
            file,
            [key],
            "error",
            "operation-in-multiple-files",
            () =>
              `Operation '${key}' also appears in '${firstFile}'. An operation's full example set must live in a single file.`,
            key,
          ),
        );
      } else if (firstFile === undefined) {
        operationFiles.set(key, file.path);
      }

      const interfaceName = key.includes(".") ? key.slice(0, key.indexOf(".")) : key;
      const firstInterfaceFile = interfaceFiles.get(interfaceName);
      if (firstInterfaceFile !== undefined && firstInterfaceFile !== file.path) {
        diagnostics.push(
          diag(
            file,
            [key],
            "error",
            "interface-split-across-files",
            () =>
              `Interface '${interfaceName}' is split across files ('${firstInterfaceFile}' and '${file.path}'). Each interface must appear in exactly one file.`,
            key,
          ),
        );
      } else if (firstInterfaceFile === undefined) {
        interfaceFiles.set(interfaceName, file.path);
      }
    }
  }

  return diagnostics;
}

function collectStrings(value: unknown, visit: (value: string) => void): void {
  if (typeof value === "string") {
    visit(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, visit);
  } else if (value !== null && typeof value === "object") {
    for (const item of Object.values(value)) collectStrings(item, visit);
  }
}

function diag(
  file: LoadedExampleFile,
  path: (string | number)[],
  severity: "error" | "warning",
  code: string,
  message: () => string,
  operation?: string,
): ExampleDiagnostic {
  const loc = locationAt(file, path);
  return {
    code,
    message: message(),
    severity,
    file: file.path,
    line: loc?.line,
    col: loc?.col,
    operation,
  };
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
