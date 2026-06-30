import type { Namespace, Program } from "@typespec/compiler";
import { unsafe_mutateSubgraphWithNamespace } from "@typespec/compiler/experimental";
import { getVersioningMutators } from "@typespec/versioning";
import { listServices } from "@typespec/compiler";
import type { VersionedView, ComparisonPhase, VersionPair, ComparisonPair } from "./types.js";

/**
 * Result of enumerating versions from a compiled program.
 */
export interface ServiceVersionInfo {
  /** The service namespace. */
  service: Namespace;
  /** Ordered list of version strings (chronological). */
  versions: string[];
}

/**
 * Enumerate all api-versions from a compiled TypeSpec program.
 * Returns version info for the first versioned service found.
 *
 * @param program - A compiled TypeSpec program
 * @returns ServiceVersionInfo with ordered version strings, or undefined if not versioned
 */
export function enumerateVersions(program: Program): ServiceVersionInfo | undefined {
  const services = listServices(program);
  if (services.length === 0) {
    return undefined;
  }

  for (const service of services) {
    const mutators = getVersioningMutators(program, service.type);
    if (mutators === undefined) {
      continue;
    }

    if (mutators.kind === "versioned") {
      const versions = mutators.snapshots.map((s) => s.version.value);
      return { service: service.type, versions };
    }
  }

  return undefined;
}

/**
 * Create a VersionedView by applying a version mutator to the program.
 * Returns a namespace projected to a specific api-version.
 */
export function createVersionedView(
  program: Program,
  service: Namespace,
  versionValue: string,
): VersionedView {
  const mutators = getVersioningMutators(program, service);
  if (mutators === undefined || mutators.kind !== "versioned") {
    throw new Error(`Service is not versioned`);
  }

  const snapshot = mutators.snapshots.find((s) => s.version.value === versionValue);
  if (!snapshot) {
    throw new Error(`Version '${versionValue}' not found in service`);
  }

  const subgraph = unsafe_mutateSubgraphWithNamespace(program, [snapshot.mutator], service);

  return {
    version: versionValue,
    program,
    versionedNamespace: subgraph.type as Namespace,
  };
}

/**
 * Build comparison pairs for Phase A (same-version) and Phase B (cross-version).
 *
 * Phase A: Compare base@V vs head@V for each version present in BOTH base and head.
 * Phase B: For consecutive versions within head, compare head@V(n) vs head@V(n+1).
 *
 * @param baseVersions - Ordered version strings from the base program
 * @param headVersions - Ordered version strings from the head program
 * @returns Array of VersionPair describing all comparisons to perform
 */
export function buildComparisonPairs(
  baseVersions: string[],
  headVersions: string[],
): VersionPair[] {
  const pairs: VersionPair[] = [];

  // Phase A: same-version comparison (base@V vs head@V)
  const baseSet = new Set(baseVersions);
  for (const version of headVersions) {
    if (baseSet.has(version)) {
      pairs.push({
        baseVersion: version,
        headVersion: version,
        phase: "same-version",
      });
    }
  }

  // Phase B: cross-version comparison (consecutive versions in head)
  for (let i = 0; i < headVersions.length - 1; i++) {
    pairs.push({
      baseVersion: headVersions[i],
      headVersion: headVersions[i + 1],
      phase: "cross-version",
    });
  }

  return pairs;
}
