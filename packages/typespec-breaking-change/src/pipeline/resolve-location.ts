import {
  getSourceLocation,
  type Model,
  type ModelProperty,
  type Namespace,
  type Program,
  type SourceLocation,
  type Type,
} from "@typespec/compiler";
import type { Finding, ResolvedLocation, SourceTraceLevel } from "../types.js";

/**
 * Resolve the source location for a finding, using a cascading fallback chain
 * that guarantees a location is always returned when possible.
 *
 * Fallback chain (in priority order):
 * 1. Direct source location on the diff (headSourceLocation)
 * 2. Origin source location (named type/property declaration)
 * 3. Base source location
 * 4. Parent model/type fallback
 * 5. Operation declaration source location
 * 6. Service namespace source location + element path
 *
 * This function should never return undefined for operation-relative diffs
 * when either the operation or service namespace source can be resolved.
 */
export function resolveFindingLocation(finding: Finding): ResolvedLocation | undefined {
  const diff = finding.diff;

  // 1. Head source location (highest priority — set by resolveHeadSourceLocations
  // for cross-compilation findings, or by the diff engine for same-program findings)
  if (diff.headSourceLocation && isValidSourceLocation(diff.headSourceLocation)) {
    return resolvedLocation(diff.headSourceLocation, diff.headSourceTraceLevel ?? "direct");
  }

  // 2. Origin source location (property/type declaration in user code)
  if (diff.origin?.sourceLocation && isValidSourceLocation(diff.origin.sourceLocation)) {
    return resolvedLocation(diff.origin.sourceLocation, "origin");
  }

  // 3. Base source location fallback
  if (diff.baseSourceLocation && isValidSourceLocation(diff.baseSourceLocation)) {
    return resolvedLocation(diff.baseSourceLocation, "base");
  }

  // 3. Parent model fallback — when type exists but has no useful location
  const type = diff.headType ?? diff.baseType;
  if (type) {
    const resolvedTypeLoc = resolveTypeLocationWithModelFallback(type);
    if (resolvedTypeLoc && isValidSourceLocation(resolvedTypeLoc.location)) {
      return resolvedLocation(resolvedTypeLoc.location, resolvedTypeLoc.traceLevel);
    }
  }

  // 5. Operation declaration source location fallback
  if (diff.operationSourceLocation && isValidSourceLocation(diff.operationSourceLocation)) {
    return resolvedLocation(diff.operationSourceLocation, "operation");
  }

  // 6. Service namespace fallback — include element path for disambiguation
  const namespaceLoc = resolveNamespaceLocation(finding);
  if (namespaceLoc && isValidSourceLocation(namespaceLoc)) {
    return {
      location: namespaceLoc,
      sourceTraceLevel: "namespace",
      elementPath: diff.identity.element,
    };
  }

  return undefined;
}

function resolvedLocation(
  location: SourceLocation,
  sourceTraceLevel: SourceTraceLevel,
): ResolvedLocation {
  return { location, sourceTraceLevel };
}

/**
 * Try to get a source location for a type, falling back to its parent model.
 *
 * Handles cases where:
 * - Type is Intrinsic (boolean, int32, etc.) with no user-code location
 * - Property is on an anonymous model
 * - Type has a synthetic/unknown location
 */
function resolveTypeLocationWithModelFallback(
  type: Type,
): { location: SourceLocation; traceLevel: Extract<SourceTraceLevel, "direct" | "origin" | "parentModel"> } | undefined {
  // Try direct location on the type
  const typeLoc = safeGetSourceLocation(type);
  if (typeLoc && isValidSourceLocation(typeLoc)) {
    return { location: typeLoc, traceLevel: "direct" };
  }

  // For ModelProperty: try the parent model
  if (type.kind === "ModelProperty") {
    const prop = type as ModelProperty;

    // Follow sourceProperty chain first
    let current = prop;
    while (current.sourceProperty) {
      current = current.sourceProperty;
    }
    const chainLoc = safeGetSourceLocation(current);
    if (chainLoc && isValidSourceLocation(chainLoc)) {
      return { location: chainLoc, traceLevel: "origin" };
    }

    // Fall back to parent model
    if (current.model) {
      const modelLoc = safeGetSourceLocation(current.model);
      if (modelLoc && isValidSourceLocation(modelLoc)) {
        return { location: modelLoc, traceLevel: "parentModel" };
      }
    }
  }

  // For EnumMember: try parent enum
  if (type.kind === "EnumMember" && type.enum) {
    const enumLoc = safeGetSourceLocation(type.enum);
    if (enumLoc && isValidSourceLocation(enumLoc)) {
      return { location: enumLoc, traceLevel: "parentModel" };
    }
  }

  // For UnionVariant: try parent union
  if (type.kind === "UnionVariant" && type.union) {
    const unionLoc = safeGetSourceLocation(type.union);
    if (unionLoc && isValidSourceLocation(unionLoc)) {
      return { location: unionLoc, traceLevel: "parentModel" };
    }
  }

  return undefined;
}

/**
 * Check if a source location is valid and points to real code.
 * Rejects empty/synthetic locations and <unknown> markers.
 */
function isValidSourceLocation(loc: SourceLocation): boolean {
  if (!loc || !loc.file) return false;
  if (!loc.file.path || loc.file.path === "<unknown location>") return false;
  return true;
}

/**
 * Safely get source location from a type.
 */
function safeGetSourceLocation(type: Type): SourceLocation | undefined {
  try {
    return getSourceLocation(type, { locateId: true }) ?? getSourceLocation(type) ?? undefined;
  } catch {
    return undefined;
  }
}

function resolveNamespaceLocation(finding: Finding): SourceLocation | undefined {
  if (!finding.serviceNamespace) {
    return undefined;
  }

  return safeGetSourceLocation(finding.serviceNamespace);
}

/**
 * Post-process findings to resolve headSourceLocation by looking up types
 * in the unmutated head program. This handles cross-compilation scenarios
 * (Phase A) where headType is null because the type is projected out, but
 * the type still exists in the head source.
 *
 * For each finding with null headType:
 * - If the property exists in the head program → sets headSourceLocation to property
 * - If only the parent model exists → sets headSourceLocation to the model
 * - If neither exists → leaves headSourceLocation null (truly deleted)
 *
 * This must be called before reporting so that resolveFindingLocation can
 * correctly distinguish "type projected out" from "type truly deleted."
 */
export function resolveHeadSourceLocations(findings: Finding[], headProgram: Program): void {
  for (const finding of findings) {
    const diff = finding.diff;
    // Only process findings where head type is missing
    if (diff.headType || diff.headSourceLocation) continue;
    if (!diff.baseType || diff.baseType.kind !== "ModelProperty") continue;

    const prop = diff.baseType as ModelProperty;
    const propName = prop.name;
    // Use the node's parent to get the SOURCE model name (not the projected model)
    const modelName = (prop.node as any)?.parent?.id?.sv ?? prop.model?.name;
    if (!modelName) continue;

    const headModel =
      findModelFromOrigin(headProgram, finding.diff.origin?.declarationPath) ??
      findModelInServiceNamespace(headProgram, finding.serviceNamespace, modelName) ??
      findModelInProgram(headProgram, modelName);
    if (!headModel) continue;

    // Check if the property exists on the head model
    const headProp = headModel.properties.get(propName);
    if (headProp) {
      // Property exists in head source — link to it
      const loc = safeGetSourceLocation(headProp);
      if (loc && isValidSourceLocation(loc)) {
        diff.headSourceLocation = loc;
        diff.headSourceTraceLevel = "direct";
        continue;
      }
    }

    // Property doesn't exist but model does — link to parent model
    const modelLoc = safeGetSourceLocation(headModel);
    if (modelLoc && isValidSourceLocation(modelLoc)) {
      diff.headSourceLocation = modelLoc;
      diff.headSourceTraceLevel = "parentModel";
    }
  }
}

function findModelFromOrigin(program: Program, declarationPath: string | undefined): Model | undefined {
  if (!declarationPath) {
    return undefined;
  }

  return (
    findModelByQualifiedPath(program, declarationPath) ??
    findModelByQualifiedPath(program, declarationPath.split(".").slice(0, -1).join("."))
  );
}

/**
 * Find a model by name in a program's namespace tree.
 * Walks all namespaces recursively looking for a model with the given name.
 */
function findModelInProgram(program: Program, modelName: string): Model | undefined {
  // Walk the global namespace and all sub-namespaces
  const globalNs = program.getGlobalNamespaceType();
  return findModelInNamespace(globalNs, modelName);
}

function findModelInServiceNamespace(
  program: Program,
  serviceNamespace: Namespace | undefined,
  modelName: string,
): Model | undefined {
  if (!serviceNamespace) {
    return undefined;
  }

  const headNamespace = findMatchingNamespace(program, serviceNamespace);
  if (!headNamespace) {
    return undefined;
  }

  return findModelInNamespace(headNamespace, modelName);
}

function findMatchingNamespace(program: Program, namespace: Namespace): Namespace | undefined {
  const namespacePath = getNamespacePath(namespace);
  let current: Namespace | undefined = program.getGlobalNamespaceType();

  for (const segment of namespacePath) {
    current = current?.namespaces.get(segment);
    if (!current) {
      return undefined;
    }
  }

  return current;
}

function getNamespacePath(namespace: Namespace): string[] {
  const path: string[] = [];
  let current: Namespace | undefined = namespace;

  while (current && current.name) {
    path.unshift(current.name);
    current = current.namespace;
  }

  return path;
}

function findModelByQualifiedPath(program: Program, qualifiedPath: string): Model | undefined {
  if (!qualifiedPath) {
    return undefined;
  }

  const parts = qualifiedPath.split(".").filter(Boolean);
  if (parts.length === 0) {
    return undefined;
  }

  const modelName = parts[parts.length - 1];
  let current: Namespace | undefined = program.getGlobalNamespaceType();

  for (const segment of parts.slice(0, -1)) {
    current = current?.namespaces.get(segment);
    if (!current) {
      return undefined;
    }
  }

  return current?.models.get(modelName);
}

function findModelInNamespace(ns: Namespace, modelName: string): Model | undefined {
  // Check models directly in this namespace
  const model = ns.models.get(modelName);
  if (model) return model;

  // Recurse into sub-namespaces
  for (const [, subNs] of ns.namespaces) {
    const found = findModelInNamespace(subNs, modelName);
    if (found) return found;
  }

  return undefined;
}
