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
 * Returns version info for ALL versioned services found.
 *
 * @param program - A compiled TypeSpec program
 * @returns Array of ServiceVersionInfo, one per versioned service. Empty if none are versioned.
 */
export function enumerateVersions(program: Program): ServiceVersionInfo[] {
  const services = listServices(program);
  const results: ServiceVersionInfo[] = [];

  for (const service of services) {
    const mutators = getVersioningMutators(program, service.type);
    if (mutators === undefined) {
      continue;
    }

    if (mutators.kind === "versioned") {
      const versions = mutators.snapshots.map((s) => s.version.value);
      results.push({ service: service.type, versions });
    }
  }

  return results;
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
 * Classifies a version string as "stable" or "preview".
 */
export type VersionClassifier = (version: string) => "stable" | "preview";

/**
 * Default version classifier: versions ending with "-preview" are preview, all others are stable.
 */
export const defaultVersionClassifier: VersionClassifier = (version) =>
  version.endsWith("-preview") ? "preview" : "stable";

/**
 * Build Phase A comparison pairs: base@V vs head@V for each version present in BOTH.
 * Detects unintentional changes within an already-released version.
 *
 * @param baseVersions - Ordered version strings from the base program
 * @param headVersions - Ordered version strings from the head program
 * @returns Phase A VersionPairs (same-version comparisons)
 */
export function buildPhaseAPairs(baseVersions: string[], headVersions: string[]): VersionPair[] {
  const baseSet = new Set(baseVersions);
  return headVersions
    .filter((v) => baseSet.has(v))
    .map((version) => ({
      baseVersion: version,
      headVersion: version,
      phase: "same-version" as ComparisonPhase,
    }));
}

/**
 * Build Phase B comparison pairs: for each candidate version, compare it to
 * the previous stable version in the head version list.
 *
 * Phase B detects breaking changes between api-versions. Candidates are:
 * - New versions (in head but not in base)
 * - Changed versions (Phase A detected diffs for them)
 *
 * If no previous stable version exists for a candidate, no pair is produced.
 *
 * @param headVersions - Ordered version strings from the head program
 * @param candidates - Versions to check (new + changed)
 * @param classifier - Classifies versions as stable or preview (defaults to "-preview" suffix check)
 * @returns Phase B VersionPairs (cross-version comparisons)
 */
export function buildPhaseBPairs(
  headVersions: string[],
  candidates: string[],
  classifier: VersionClassifier = defaultVersionClassifier,
): VersionPair[] {
  const pairs: VersionPair[] = [];
  const candidateSet = new Set(candidates);

  for (let i = 0; i < headVersions.length; i++) {
    const version = headVersions[i];
    if (!candidateSet.has(version)) continue;

    // Walk backwards to find the previous stable version
    const previousStable = findPreviousStable(headVersions, i, classifier);
    if (previousStable !== undefined) {
      pairs.push({
        baseVersion: previousStable,
        headVersion: version,
        phase: "cross-version",
      });
    }
  }

  return pairs;
}

/**
 * Find the previous stable version before index `i` in the version list.
 * If no stable version precedes this index, falls back to the immediately
 * preceding version (regardless of stability). This ensures preview-only
 * services still get cross-version comparisons.
 * Returns undefined only if `beforeIndex` is 0.
 */
function findPreviousStable(
  versions: string[],
  beforeIndex: number,
  classifier: VersionClassifier,
): string | undefined {
  for (let j = beforeIndex - 1; j >= 0; j--) {
    if (classifier(versions[j]) === "stable") {
      return versions[j];
    }
  }
  // No stable predecessor found — fall back to immediately preceding version
  if (beforeIndex > 0) {
    return versions[beforeIndex - 1];
  }
  return undefined;
}

/**
 * Build all comparison pairs (Phase A + Phase B).
 * Phase B candidates default to new versions (in head but not base).
 * For changed versions (detected by Phase A), call buildPhaseBPairs separately
 * after Phase A analysis completes.
 *
 * @param baseVersions - Ordered version strings from the base program
 * @param headVersions - Ordered version strings from the head program
 * @param classifier - Version classifier (defaults to "-preview" suffix check)
 * @returns Combined Phase A and Phase B VersionPairs
 */
export function buildComparisonPairs(
  baseVersions: string[],
  headVersions: string[],
  classifier: VersionClassifier = defaultVersionClassifier,
): VersionPair[] {
  const phaseA = buildPhaseAPairs(baseVersions, headVersions);

  // Phase B candidates (statically known): new versions in head
  const baseSet = new Set(baseVersions);
  const newVersions = headVersions.filter((v) => !baseSet.has(v));

  const phaseB = buildPhaseBPairs(headVersions, newVersions, classifier);

  return [...phaseA, ...phaseB];
}
