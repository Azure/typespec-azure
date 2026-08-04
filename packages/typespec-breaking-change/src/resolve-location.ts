import { getSourceLocation, type Model, type ModelProperty, type Namespace, type Program, type SourceLocation, type Type } from "@typespec/compiler";
import type { Finding } from "./types.js";

/**
 * Resolve the source location for a finding, using a cascading fallback chain
 * that guarantees a location is always returned when possible.
 *
 * Fallback chain (in priority order):
 * 1. Origin source location (most specific — points to named type/property declaration)
 * 2. Direct source location on the diff (headSourceLocation or baseSourceLocation)
 * 3. Parent model source location (when property type is Intrinsic or has no location)
 * 4. Operation declaration source location (always available for operation-relative diffs)
 *
 * This function should never return undefined for operation-relative diffs.
 */
export function resolveFindingLocation(finding: Finding): SourceLocation | undefined {
  const diff = finding.diff;

  // 1. Head source location (highest priority — set by resolveHeadSourceLocations
  // for cross-compilation findings, or by the diff engine for same-program findings)
  if (diff.headSourceLocation && isValidSourceLocation(diff.headSourceLocation)) {
    return diff.headSourceLocation;
  }

  // 2. Origin source location (property/type declaration in user code)
  if (diff.origin?.sourceLocation && isValidSourceLocation(diff.origin.sourceLocation)) {
    return diff.origin.sourceLocation;
  }

  // 3. Base source location fallback
  if (diff.baseSourceLocation && isValidSourceLocation(diff.baseSourceLocation)) {
    return diff.baseSourceLocation;
  }

  // 3. Parent model fallback — when type exists but has no useful location
  const type = diff.headType ?? diff.baseType;
  if (type) {
    const modelLoc = resolveTypeLocationWithModelFallback(type);
    if (modelLoc && isValidSourceLocation(modelLoc)) {
      return modelLoc;
    }
  }

  // 4. Operation declaration source location (final fallback)
  if (diff.operationSourceLocation && isValidSourceLocation(diff.operationSourceLocation)) {
    return diff.operationSourceLocation;
  }

  return undefined;
}

/**
 * Try to get a source location for a type, falling back to its parent model.
 *
 * Handles cases where:
 * - Type is Intrinsic (boolean, int32, etc.) with no user-code location
 * - Property is on an anonymous model
 * - Type has a synthetic/unknown location
 */
function resolveTypeLocationWithModelFallback(type: Type): SourceLocation | undefined {
  // Try direct location on the type
  const typeLoc = safeGetSourceLocation(type);
  if (typeLoc && isValidSourceLocation(typeLoc)) {
    return typeLoc;
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
      return chainLoc;
    }

    // Fall back to parent model
    if (current.model) {
      const modelLoc = safeGetSourceLocation(current.model);
      if (modelLoc && isValidSourceLocation(modelLoc)) {
        return modelLoc;
      }
    }
  }

  // For EnumMember: try parent enum
  if (type.kind === "EnumMember" && type.enum) {
    const enumLoc = safeGetSourceLocation(type.enum);
    if (enumLoc && isValidSourceLocation(enumLoc)) {
      return enumLoc;
    }
  }

  // For UnionVariant: try parent union
  if (type.kind === "UnionVariant" && type.union) {
    const unionLoc = safeGetSourceLocation(type.union);
    if (unionLoc && isValidSourceLocation(unionLoc)) {
      return unionLoc;
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

    // Look up the model by name in the head program's namespace tree
    const headModel = findModelInProgram(headProgram, modelName);
    if (!headModel) continue;

    // Check if the property exists on the head model
    const headProp = headModel.properties.get(propName);
    if (headProp) {
      // Property exists in head source — link to it
      const loc = safeGetSourceLocation(headProp);
      if (loc && isValidSourceLocation(loc)) {
        diff.headSourceLocation = loc;
        continue;
      }
    }

    // Property doesn't exist but model does — link to parent model
    const modelLoc = safeGetSourceLocation(headModel);
    if (modelLoc && isValidSourceLocation(modelLoc)) {
      diff.headSourceLocation = modelLoc;
    }
  }
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
