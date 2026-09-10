import type { Program } from "@typespec/compiler";
import {
  buildSuppressionInventory,
  suppressionIdentityKey,
  type NormalizedSuppressionRecord,
} from "./inventory.js";

/**
 * Classification result for a single suppression.
 */
export type SuppressionClassificationKind = "new" | "existing" | "removed" | "modified";

/**
 * A classified suppression with base/head context.
 */
export interface ClassifiedSuppression {
  /** The classification result */
  classification: SuppressionClassificationKind;
  /** The head suppression record (absent for REMOVED) */
  head?: NormalizedSuppressionRecord;
  /** The base suppression record (absent for NEW) */
  base?: NormalizedSuppressionRecord;
  /** Identity key for lookup */
  identityKey: string;
}

/**
 * Full result of comparing suppressions between base and head.
 */
export interface SuppressionComparisonResult {
  /** All classified suppressions */
  classifications: ClassifiedSuppression[];
  /** Lookup from identity key to classification (for head suppressions) */
  headLookup: Map<string, ClassifiedSuppression>;
  /** Recommended PR labels based on new/modified suppressions */
  recommendedLabels: string[];
}

/**
 * Compare suppression inventories between base and head programs.
 * Classifies each suppression as NEW, EXISTING, REMOVED, or MODIFIED.
 */
export function compareSuppressions(
  baseProgram: Program,
  headProgram: Program,
): SuppressionComparisonResult {
  const baseInventory = buildSuppressionInventory(baseProgram);
  const headInventory = buildSuppressionInventory(headProgram);
  return compareInventories(baseInventory, headInventory);
}

/**
 * Compare two suppression inventories directly.
 * Useful for testing without full program compilation.
 */
export function compareInventories(
  baseInventory: NormalizedSuppressionRecord[],
  headInventory: NormalizedSuppressionRecord[],
): SuppressionComparisonResult {
  // Build maps keyed by identity
  const baseByKey = groupByIdentityKey(baseInventory);
  const headByKey = groupByIdentityKey(headInventory);

  const classifications: ClassifiedSuppression[] = [];
  const headLookup = new Map<string, ClassifiedSuppression>();
  const processedKeys = new Set<string>();

  // Process head suppressions: classify as NEW, EXISTING, or MODIFIED
  for (const [key, headRecords] of headByKey) {
    processedKeys.add(key);
    const baseRecords = baseByKey.get(key);

    if (!baseRecords || baseRecords.length === 0) {
      // NEW: present only in head
      for (const head of headRecords) {
        const classified: ClassifiedSuppression = {
          classification: "new",
          head,
          identityKey: key,
        };
        classifications.push(classified);
        headLookup.set(buildHeadLookupKey(head), classified);
      }
    } else {
      // Match by position (localIndex order)
      const maxLen = Math.max(headRecords.length, baseRecords.length);
      for (let i = 0; i < maxLen; i++) {
        const head = headRecords[i];
        const base = baseRecords[i];

        if (head && base) {
          // Both exist — compare metadata
          const isModified = metadataDiffers(base, head);
          const classified: ClassifiedSuppression = {
            classification: isModified ? "modified" : "existing",
            head,
            base,
            identityKey: key,
          };
          classifications.push(classified);
          headLookup.set(buildHeadLookupKey(head), classified);
        } else if (head && !base) {
          // Extra in head
          const classified: ClassifiedSuppression = {
            classification: "new",
            head,
            identityKey: key,
          };
          classifications.push(classified);
          headLookup.set(buildHeadLookupKey(head), classified);
        } else if (!head && base) {
          // Removed from head
          const classified: ClassifiedSuppression = {
            classification: "removed",
            base,
            identityKey: key,
          };
          classifications.push(classified);
        }
      }
    }
  }

  // Process base-only suppressions: classify as REMOVED
  for (const [key, baseRecords] of baseByKey) {
    if (!processedKeys.has(key)) {
      for (const base of baseRecords) {
        classifications.push({
          classification: "removed",
          base,
          identityKey: key,
        });
      }
    }
  }

  const recommendedLabels = computeRecommendedLabels(classifications);

  return { classifications, headLookup, recommendedLabels };
}

/**
 * Compute recommended PR labels from classification results.
 */
function computeRecommendedLabels(classifications: ClassifiedSuppression[]): string[] {
  const labels: string[] = [];
  let needsBreakingChangeReview = false;
  let needsVersioningReview = false;

  for (const c of classifications) {
    if (c.classification !== "new" && c.classification !== "modified") continue;
    const head = c.head!;
    if (head.decorator === "approvedBreakingChange") {
      needsBreakingChangeReview = true;
    } else if (head.decorator === "approvedUnversionedChange") {
      needsVersioningReview = true;
    }
  }

  if (needsBreakingChangeReview) labels.push("BreakingChangeReviewRequired");
  if (needsVersioningReview) labels.push("VersioningReviewRequired");

  return labels;
}

/**
 * Check if metadata differs between base and head records.
 */
function metadataDiffers(
  base: NormalizedSuppressionRecord,
  head: NormalizedSuppressionRecord,
): boolean {
  if (base.since !== head.since) return true;
  if (base.reason !== head.reason) return true;
  if (base.decorator !== head.decorator) return true;
  return false;
}

/**
 * Group records by identity key, preserving order within each group.
 */
function groupByIdentityKey(
  records: NormalizedSuppressionRecord[],
): Map<string, NormalizedSuppressionRecord[]> {
  const map = new Map<string, NormalizedSuppressionRecord[]>();
  for (const record of records) {
    const key = suppressionIdentityKey(record);
    const existing = map.get(key);
    if (existing) {
      existing.push(record);
    } else {
      map.set(key, [record]);
    }
  }
  return map;
}

/**
 * Build a lookup key for head suppressions that matches what the orchestrator
 * will use when enriching findings.
 */
function buildHeadLookupKey(record: NormalizedSuppressionRecord): string {
  return suppressionIdentityKey(record);
}
