import type { DecoratorContext, Program, Type } from "@typespec/compiler";
import { isDiffKind, type DiffKind } from "../diff-kind.js";
import { BreakingChangeStateKeys, reportDiagnostic } from "../lib.js";

/**
 * Metadata stored by suppression decorators.
 */
export interface SuppressionMetadata {
  /** Optional DiffKind filter — if specified, only suppresses this specific kind. */
  kind?: DiffKind;
  /** Human-readable reason for the suppression. */
  reason: string;
  /** Optional version scope — only applies to this version pair. */
  version?: string;
  /** Optional identity path from suppression site to violation target. */
  path?: string;
}

export interface ResolvedSuppression {
  suppression: SuppressionMetadata;
  target: Type;
}

export function $approvedBreakingChange(
  context: DecoratorContext,
  target: Type,
  reason: string,
  options?: { kind?: string; since?: string; path?: string },
): void {
  const normalizedReason = getDecoratorStringValue(reason) ?? String(reason);
  const normalizedKind = options?.kind ? getDecoratorStringValue(options.kind) ?? options.kind : undefined;
  const normalizedSince = options?.since ? getDecoratorStringValue(options.since) ?? options.since : undefined;
  const normalizedPath = options?.path ? getDecoratorStringValue(options.path) ?? options.path : undefined;
  const resolvedKind = validateDiffKind(context, target, normalizedKind);
  if (normalizedKind !== undefined && resolvedKind === undefined) {
    return;
  }

  addSuppression(
    context.program,
    BreakingChangeStateKeys.approvedBreakingChange,
    target,
    resolvedKind,
    normalizedReason,
    normalizedSince,
    normalizedPath,
  );
}

export function $approvedUnversionedChange(
  context: DecoratorContext,
  target: Type,
  reason: string,
  options?: { kind?: string; path?: string },
): void {
  const normalizedReason = getDecoratorStringValue(reason) ?? String(reason);
  const normalizedKind = options?.kind ? getDecoratorStringValue(options.kind) ?? options.kind : undefined;
  const normalizedPath = options?.path ? getDecoratorStringValue(options.path) ?? options.path : undefined;
  const resolvedKind = validateDiffKind(context, target, normalizedKind);
  if (normalizedKind !== undefined && resolvedKind === undefined) {
    return;
  }

  addSuppression(
    context.program,
    BreakingChangeStateKeys.approvedUnversionedChange,
    target,
    resolvedKind,
    normalizedReason,
    undefined, // since
    normalizedPath,
  );
}

export function getSuppressions(program: Program, type: Type): SuppressionMetadata[] {
  return program.stateMap(BreakingChangeStateKeys.approvedBreakingChange).get(type) ?? [];
}

export function getUnversionedSuppressions(program: Program, type: Type): SuppressionMetadata[] {
  return program.stateMap(BreakingChangeStateKeys.approvedUnversionedChange).get(type) ?? [];
}

/**
 * Scan ALL entries in the head program's unversioned suppression state map.
 * Used for Phase A cross-compilation fallback when identity-based lookup fails
 * because the target type is from a different (base) program.
 */
export function scanAllUnversionedSuppressions(program: Program): ResolvedSuppression[] {
  const results: ResolvedSuppression[] = [];
  const stateMap = program.stateMap(BreakingChangeStateKeys.approvedUnversionedChange);
  for (const [target, suppressions] of stateMap) {
    for (const suppression of suppressions as SuppressionMetadata[]) {
      results.push({ suppression, target: target as Type });
    }
  }
  return results;
}

export function findSuppressions(program: Program, type: Type): ResolvedSuppression[] {
  return findSuppressionsWith(program, type, getSuppressions);
}

export function findUnversionedSuppressions(program: Program, type: Type): ResolvedSuppression[] {
  return findSuppressionsWith(program, type, getUnversionedSuppressions);
}

function validateDiffKind(
  context: DecoratorContext,
  target: Type,
  kind?: string,
): DiffKind | undefined {
  if (kind === undefined) {
    return undefined;
  }

  if (isDiffKind(kind)) {
    return kind;
  }

  reportDiagnostic(context.program, {
    code: "invalid-suppression-kind",
    target,
  });
  return undefined;
}

function addSuppression(
  program: Program,
  stateKey: symbol,
  target: Type,
  kind: DiffKind | undefined,
  reason: string,
  version?: string,
  path?: string,
): void {
  const stateMap = program.stateMap(stateKey);
  const existing: SuppressionMetadata[] = stateMap.get(target) ?? [];
  const metadata: SuppressionMetadata = { kind, reason };
  if (version !== undefined) metadata.version = version;
  if (path !== undefined) metadata.path = path;
  stateMap.set(target, [...existing, metadata]);
}

function findSuppressionsWith(
  program: Program,
  type: Type,
  accessor: (program: Program, type: Type) => SuppressionMetadata[],
): ResolvedSuppression[] {
  const results: ResolvedSuppression[] = [];

  for (const target of walkSuppressionTargets(type)) {
    for (const suppression of accessor(program, target)) {
      results.push({ suppression, target });
    }
  }

  return results;
}

function* walkSuppressionTargets(type: Type): Generator<Type> {
  const visited = new Set<Type>();
  let current: Type | undefined = type;

  while (current && !visited.has(current)) {
    visited.add(current);
    yield current;
    current = getParentSuppressionTarget(current);
  }
}

function getParentSuppressionTarget(type: Type): Type | undefined {
  switch (type.kind) {
    case "ModelProperty":
      return type.model ?? (type.type.kind === "Model" ? type.type : undefined);
    case "Model":
    case "Interface":
      return type.namespace;
    case "Operation":
      return type.interface ?? type.namespace;
    case "Namespace":
      return type.namespace;
    default:
      return undefined;
  }
}

function getDecoratorStringValue(value: unknown): string | undefined {
  if (typeof value === "string" || value === undefined) {
    return value;
  }

  if (typeof value === "object" && value !== null && "value" in value) {
    const stringValue = (value as { value?: unknown }).value;
    if (typeof stringValue === "string") {
      return stringValue;
    }
  }

  return undefined;
}
