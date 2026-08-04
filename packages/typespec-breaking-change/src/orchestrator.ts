import type { Namespace, Program } from "@typespec/compiler";
import { computeDiffs } from "./diff-engine.js";
import { classifyDiffs } from "./policy.js";
import { resolveHeadSourceLocations } from "./resolve-location.js";
import { applySuppressions } from "./suppression.js";
import type {
  AnalysisResult,
  AnalysisSummary,
  ComparisonPhase,
  Finding,
  TimingInfo,
  VersionComparisonSummary,
  VersionPair,
} from "./types.js";
import {
  buildPhaseAPairs,
  buildPhaseBPairs,
  createVersionedView,
  defaultVersionClassifier,
  enumerateVersions,
} from "./versions.js";

export interface AnalysisOptions {
  /** If provided, only analyze this specific service namespace. */
  serviceName?: string;
  /** If provided, only run this phase. */
  phase?: ComparisonPhase;
  /** Optional callback for progress logging (appears in CI logs). */
  log?: (message: string) => void;
}

/**
 * Run full breaking change analysis on a single program (Phase B only).
 * Compares consecutive versions within the head program.
 */
export function analyzeProgram(program: Program, options?: AnalysisOptions): AnalysisResult {
  const totalStart = Date.now();
  const timing = createEmptyTiming();
  const allFindings: Finding[] = [];
  const versionComparisons: VersionComparisonSummary[] = [];
  let servicesAnalyzed = 0;
  let comparisonsPerformed = 0;
  let hasStableVersion = false;

  for (const service of enumerateVersions(program)) {
    if (!shouldAnalyzeService(service.service, options)) {
      continue;
    }

    servicesAnalyzed++;
    if (service.versions.some((v) => defaultVersionClassifier(v) === "stable")) {
      hasStableVersion = true;
    }
    options?.log?.(`Analyzing service: ${service.service.name} (${service.versions.length} versions)`);

    if (options?.phase === "same-version") {
      continue;
    }

    const pairStart = Date.now();
    const pairs = buildPhaseBPairs(service.versions, service.versions);
    timing.versionMutatorsMs += Date.now() - pairStart;

    comparisonsPerformed += pairs.length;
    for (const pair of pairs) {
      const baseView = timeVersionedView(program, service.service, pair.baseVersion, timing);
      const headView = timeVersionedView(program, service.service, pair.headVersion, timing);
      const findings = analyzePair(baseView, headView, pair, timing);
      allFindings.push(...findings);
      versionComparisons.push({
        serviceName: service.service.name,
        baseVersion: pair.baseVersion,
        headVersion: pair.headVersion,
        phase: pair.phase,
        findingCount: findings.length,
      });
      options?.log?.(
        `  Phase B: ${pair.baseVersion} \u2192 ${pair.headVersion} \u2014 ${formatComparisonResult(findings.length)}`,
      );
    }
  }

  const dedupStart = Date.now();
  const dedupedFindings = deduplicateBySourceType(allFindings);
  timing.classifyMs += Date.now() - dedupStart;

  const merged = mergeRequestResponseToResource(dedupedFindings);
  const deduped = collapsePhaseADuplicates(merged);

  const suppressStart = Date.now();
  const findings = applySuppressions(deduped, program);
  timing.suppressMs += Date.now() - suppressStart;

  timing.totalMs = Date.now() - totalStart;

  const summary = buildSummary(servicesAnalyzed, comparisonsPerformed, versionComparisons, options, hasStableVersion);
  return { findings, timing, summary };
}

/**
 * Run full breaking change analysis comparing base and head programs (Phase A + Phase B).
 */
export function analyzeBaseAndHead(
  baseProgram: Program,
  headProgram: Program,
  options?: AnalysisOptions,
): AnalysisResult {
  const totalStart = Date.now();
  const timing = createEmptyTiming();
  const allFindings: Finding[] = [];
  const versionComparisons: VersionComparisonSummary[] = [];
  let servicesAnalyzed = 0;
  let comparisonsPerformed = 0;

  const baseServices = enumerateVersions(baseProgram);
  let hasStableVersion = false;

  for (const headService of enumerateVersions(headProgram)) {
    if (!shouldAnalyzeService(headService.service, options)) {
      continue;
    }

    servicesAnalyzed++;
    if (headService.versions.some((v) => defaultVersionClassifier(v) === "stable")) {
      hasStableVersion = true;
    }
    options?.log?.(`Analyzing service: ${headService.service.name} (${headService.versions.length} versions)`);
    const baseService = baseServices.find((candidate) => candidate.service.name === headService.service.name);
    const changedVersions: string[] = [];

    if (!options?.phase || options.phase === "same-version") {
      const pairStart = Date.now();
      const phaseAPairs = buildPhaseAPairs(baseService?.versions ?? [], headService.versions);
      timing.versionMutatorsMs += Date.now() - pairStart;

      comparisonsPerformed += phaseAPairs.length;
      for (const pair of phaseAPairs) {
        if (!baseService) {
          continue;
        }

        const baseView = timeVersionedView(baseProgram, baseService.service, pair.baseVersion, timing);
        const headView = timeVersionedView(headProgram, headService.service, pair.headVersion, timing);
        const findings = analyzePair(baseView, headView, pair, timing);
        versionComparisons.push({
          serviceName: headService.service.name,
          baseVersion: pair.baseVersion,
          headVersion: pair.headVersion,
          phase: pair.phase,
          findingCount: findings.length,
        });
        options?.log?.(
          `  Phase A: ${pair.headVersion} (base \u2192 head) \u2014 ${formatComparisonResult(findings.length)}`,
        );

        if (findings.length > 0) {
          changedVersions.push(pair.headVersion);
          allFindings.push(...findings);
        }
      }
    }

    if (!options?.phase || options.phase === "cross-version") {
      const newVersions = baseService
        ? headService.versions.filter((version) => !baseService.versions.includes(version))
        : headService.versions;
      const candidates = [...new Set([...changedVersions, ...newVersions])];

      if (candidates.length > 0) {
        const pairStart = Date.now();
        const phaseBPairs = buildPhaseBPairs(headService.versions, candidates);
        timing.versionMutatorsMs += Date.now() - pairStart;

        comparisonsPerformed += phaseBPairs.length;
        for (const pair of phaseBPairs) {
          const baseView = timeVersionedView(headProgram, headService.service, pair.baseVersion, timing);
          const headView = timeVersionedView(headProgram, headService.service, pair.headVersion, timing);
          const findings = analyzePair(baseView, headView, pair, timing);
          allFindings.push(...findings);
          versionComparisons.push({
            serviceName: headService.service.name,
            baseVersion: pair.baseVersion,
            headVersion: pair.headVersion,
            phase: pair.phase,
            findingCount: findings.length,
          });
          options?.log?.(
            `  Phase B: ${pair.baseVersion} \u2192 ${pair.headVersion} \u2014 ${formatComparisonResult(findings.length)}`,
          );
        }
      }
    }
  }

  const dedupStart = Date.now();
  const dedupedFindings = deduplicateBySourceType(allFindings);
  timing.classifyMs += Date.now() - dedupStart;

  const merged = mergeRequestResponseToResource(dedupedFindings);
  const deduped = collapsePhaseADuplicates(merged);

  const suppressStart = Date.now();
  const findings = applySuppressions(deduped, headProgram);
  timing.suppressMs += Date.now() - suppressStart;

  // Resolve head source locations for cross-compilation findings.
  // Looks up types by name in the unmutated head program to determine
  // whether a type truly doesn't exist in head (link to parent) vs
  // exists but is projected out (link to the type itself).
  resolveHeadSourceLocations(findings, headProgram);

  timing.totalMs = Date.now() - totalStart;

  const summary = buildSummary(servicesAnalyzed, comparisonsPerformed, versionComparisons, options, hasStableVersion);
  return { findings, timing, summary };
}

function analyzePair(
  baseView: ReturnType<typeof createVersionedView>,
  headView: ReturnType<typeof createVersionedView>,
  versionPair: VersionPair,
  timing: TimingInfo,
): Finding[] {
  const diffStart = Date.now();
  const { diffs } = computeDiffs(baseView, headView);
  timing.diffEngineMs += Date.now() - diffStart;

  const classifyStart = Date.now();
  const findings = classifyDiffs(diffs, versionPair.phase, versionPair);
  timing.classifyMs += Date.now() - classifyStart;

  return findings;
}

function timeVersionedView(
  program: Program,
  service: Namespace,
  version: string,
  timing: TimingInfo,
) {
  const start = Date.now();
  const view = createVersionedView(program, service, version);
  timing.versionMutatorsMs += Date.now() - start;
  return view;
}

function shouldAnalyzeService(service: Namespace, options?: AnalysisOptions): boolean {
  return options?.serviceName === undefined || service.name.includes(options.serviceName);
}

function createEmptyTiming(): TimingInfo {
  return {
    compileBaseMs: 0,
    compileHeadMs: 0,
    versionMutatorsMs: 0,
    canonicalizeMs: 0,
    identityMatchingMs: 0,
    diffEngineMs: 0,
    classifyMs: 0,
    suppressMs: 0,
    reportMs: 0,
    totalMs: 0,
  };
}

function buildSummary(
  servicesAnalyzed: number,
  comparisonsPerformed: number,
  versionComparisons: VersionComparisonSummary[] = [],
  options?: AnalysisOptions,
  hasStableVersion?: boolean,
): AnalysisSummary {
  const summary: AnalysisSummary = {
    servicesAnalyzed,
    comparisonsPerformed,
    phase: options?.phase,
    versionComparisons,
  };

  if (comparisonsPerformed === 0) {
    if (servicesAnalyzed === 0) {
      summary.noComparisonReason = "No versioned services found in the program.";
    } else if (options?.phase === "same-version") {
      summary.noComparisonReason =
        "Phase A (same-version) requires a base program for comparison. Use analyzeBaseAndHead() instead.";
    } else if (hasStableVersion) {
      summary.noComparisonReason =
        "No cross-version comparisons needed: no comparisons to stable versions needed.";
    } else {
      summary.noComparisonReason =
        "No cross-version comparisons needed: all versions are preview (no stable baseline exists).";
    }
  }

  return summary;
}

function formatComparisonResult(findingCount: number): string {
  return findingCount === 0 ? "no changes" : `${findingCount} finding${findingCount === 1 ? "" : "s"}`;
}

/**
 * Deduplicate findings that trace back to the same source type declaration.
 *
 * Source type tracing is fundamental to the design: headType/baseType on each
 * finding points to the original TypeSpec declaration (ModelProperty, Scalar, etc.).
 * When the same model property (e.g., `Employee.city`) appears in multiple
 * operations (GET, PUT, PATCH), the diff engine produces separate findings
 * for each. Since version projection reuses type objects, these findings share
 * the same source type reference — enabling identity-based deduplication.
 *
 * Dedup key: source type reference identity + diff kind + version pair.
 * Falls back to string key (kind + element + versions) only when no source
 * type is available (e.g., service-level diffs like ApiVersionRemoved).
 */
function deduplicateBySourceType(findings: Finding[]): Finding[] {
  const seenByNode = new Map<object, Set<string>>();
  const seenByString = new Set<string>();
  const result: Finding[] = [];

  for (const f of findings) {
    const versionKey = `${f.versionPair.baseVersion}|${f.versionPair.headVersion}`;
    const kindVersionKey = `${f.diff.kind}|${versionKey}`;

    const sourceType = f.diff.headType ?? f.diff.baseType;
    // Use AST node identity for dedup — visibility-filtered model copies
    // (e.g., EmployeePropertiesCreateOrUpdate.city) share the same node as
    // the original declaration (EmployeeProperties.city).
    const dedupKey = sourceType && (sourceType as any).node ? (sourceType as any).node : sourceType;

    if (dedupKey) {
      let kindSet = seenByNode.get(dedupKey);
      if (!kindSet) {
        kindSet = new Set();
        seenByNode.set(dedupKey, kindSet);
      }
      if (kindSet.has(kindVersionKey)) continue;
      kindSet.add(kindVersionKey);
    } else {
      // String fallback for findings without source type
      const stringKey = `${f.diff.kind}|${f.diff.identity.element}|${versionKey}`;
      if (seenByString.has(stringKey)) continue;
      seenByString.add(stringKey);
    }

    result.push(f);
  }

  return result;
}

/**
 * Mapping from Request/Response property kind suffixes to their Resource equivalent.
 */
const REQUEST_RESPONSE_PAIRS: Record<string, string> = {
  PropertyAdded: "ResourcePropertyAdded",
  PropertyRemoved: "ResourcePropertyRemoved",
  PropertyRenamed: "ResourcePropertyRenamed",
  PropertyTypeChanged: "ResourcePropertyTypeChanged",
  PropertyTypeNarrowed: "ResourcePropertyTypeNarrowed",
  PropertyTypeWidened: "ResourcePropertyTypeWidened",
  PropertyMadeRequired: "ResourcePropertyMadeRequired",
  PropertyMadeOptional: "ResourcePropertyMadeOptional",
};

/**
 * Merge matching Request + Response findings into single Resource findings.
 *
 * When the same model property appears in both request and response bodies
 * (common in ARM resources using TrackedResource<T>), the diff engine produces
 * separate Request* and Response* findings. This merges them into a single
 * Resource* finding to reduce noise.
 *
 * Match criteria: same AST node (or element path), same version pair,
 * and kinds are the Request/Response pair (e.g., RequestPropertyRemoved +
 * ResponsePropertyRemoved → ResourcePropertyRemoved).
 */
function mergeRequestResponseToResource(findings: Finding[]): Finding[] {
  const result: Finding[] = [];
  const consumed = new Set<Finding>();

  // Index Response findings by (element + version + suffix + suppressed)
  const responseIndex = new Map<string, Finding>();
  for (const f of findings) {
    if (!f.diff.kind.startsWith("Response")) continue;
    const suffix = getPropertySuffix(f.diff.kind, "Response");
    if (!suffix || !REQUEST_RESPONSE_PAIRS[suffix]) continue;

    const key = buildMergeKey(f, suffix);
    if (key) responseIndex.set(key, f);
  }

  // First pass: find all Request findings that have a Response match
  for (const f of findings) {
    if (!f.diff.kind.startsWith("Request")) continue;
    const suffix = getPropertySuffix(f.diff.kind, "Request");
    if (!suffix || !REQUEST_RESPONSE_PAIRS[suffix]) continue;

    const key = buildMergeKey(f, suffix);
    if (key) {
      const match = responseIndex.get(key);
      if (match && match.suppressed === f.suppressed) {
        // Mark both as consumed, emit a Resource finding
        consumed.add(f);
        consumed.add(match);
        const merged: Finding = {
          ...f,
          diff: { ...f.diff, kind: REQUEST_RESPONSE_PAIRS[suffix] as any },
        };
        result.push(merged);
      }
    }
  }

  // Second pass: emit all non-consumed findings in original order
  for (const f of findings) {
    if (!consumed.has(f)) {
      result.push(f);
    }
  }

  return result;
}

function getPropertySuffix(kind: string, prefix: string): string | undefined {
  if (!kind.startsWith(prefix)) return undefined;
  return kind.substring(prefix.length);
}

function buildMergeKey(f: Finding, suffix: string): string | undefined {
  const versionKey = `${f.versionPair.baseVersion}|${f.versionPair.headVersion}`;
  const suppressedKey = f.suppressed ? "s" : "u";
  return `${f.diff.identity.element}|${versionKey}|${suffix}|${suppressedKey}`;
}

/**
 * Collapse Phase A findings that repeat across version pairs.
 *
 * In Phase A (same-version), an unversioned change like removing a property
 * appears identically in every API version (e.g., once for 2021-10-01-preview
 * and once for 2021-11-01). Since it's the same logical change, report it once.
 *
 * Only collapses findings with phase === "same-version". Phase B findings
 * across different version pairs represent genuinely different comparisons.
 */
function collapsePhaseADuplicates(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  const result: Finding[] = [];

  for (const f of findings) {
    if (f.phase !== "same-version") {
      result.push(f);
      continue;
    }

    // For Phase A, dedup key excludes version pair — same element+kind = same change
    const key = `${f.diff.kind}|${f.diff.identity.element}|${f.suppressed}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(f);
  }

  return result;
}
