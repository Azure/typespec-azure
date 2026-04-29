import { EnumMember, Namespace, createRule, paramMessage } from "@typespec/compiler";

import { getVersion } from "@typespec/versioning";
import { isInternalTypeSpec } from "./utils.js";

interface ParsedVersion {
  enumMember: EnumMember;
  raw: string;
  date: string;
  suffix: string | undefined;
  suffixNumber: number | undefined;
}

/**
 * Parse a version string of the form "YYYY-MM-DD[-suffix[.N]]" into its components.
 * Returns undefined if the string does not match the expected format (the
 * `arm-resource-invalid-version-format` rule is responsible for reporting that).
 */
function parseVersion(value: string): Omit<ParsedVersion, "enumMember" | "raw"> | undefined {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})(?:-([A-Za-z]+)(?:\.(\d+))?)?$/);
  if (!match) return undefined;
  return {
    date: match[1],
    suffix: match[2],
    suffixNumber: match[3] !== undefined ? Number(match[3]) : undefined,
  };
}

/**
 * Compare two parsed versions. Returns a negative number if `a < b`, positive
 * if `a > b`, and 0 if they are equivalent.
 *
 * Ordering:
 *   1. Lexicographic (== chronological) by date.
 *   2. For equal dates, preview-style suffixes (e.g., `-preview`, `-alpha`,
 *      `-beta`) sort BEFORE stable (no suffix) versions.
 *   3. For equal dates with both having suffixes, compare suffix names
 *      lexicographically and then suffix numbers numerically.
 */
function compareVersions(
  a: Omit<ParsedVersion, "enumMember" | "raw">,
  b: Omit<ParsedVersion, "enumMember" | "raw">,
): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  // Same date — preview (has suffix) sorts before stable (no suffix).
  if (a.suffix === undefined && b.suffix !== undefined) return 1;
  if (a.suffix !== undefined && b.suffix === undefined) return -1;
  if (a.suffix !== b.suffix) {
    // both defined, compare lexicographically
    return (a.suffix ?? "") < (b.suffix ?? "") ? -1 : 1;
  }
  const aNum = a.suffixNumber ?? 0;
  const bNum = b.suffixNumber ?? 0;
  if (aNum !== bNum) return aNum - bNum;
  return 0;
}

/**
 * Validates that the versions declared on an ARM service namespace are in
 * strictly increasing chronological order, and that preview versions for a
 * given date come before the stable version for the same date.
 */
export const armVersionProgressionRule = createRule({
  name: "arm-version-progression",
  severity: "warning",
  description:
    "Validate that ARM service versions are declared in chronological order with previews before stable.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/arm-version-progression",
  messages: {
    notMonotonic: paramMessage`Version '${"version"}' is declared after '${"previous"}' but is not chronologically later. ARM versions must be declared in strictly increasing chronological order.`,
    previewAfterStable: paramMessage`Preview version '${"version"}' must not appear after the stable version '${"previous"}' with the same date '${"date"}'. Stable versions must come after their preview counterparts.`,
  },
  create(context) {
    return {
      namespace: (namespace: Namespace) => {
        if (isInternalTypeSpec(context.program, namespace)) {
          return;
        }

        const map = getVersion(context.program, namespace);
        if (map === undefined) return;

        const parsed: ParsedVersion[] = [];
        for (const version of map.getVersions()) {
          const value = version.enumMember.value ?? version.enumMember.name;
          if (typeof value !== "string") continue;
          const components = parseVersion(value);
          if (components === undefined) continue;
          parsed.push({
            enumMember: version.enumMember,
            raw: value,
            ...components,
          });
        }

        for (let i = 1; i < parsed.length; i++) {
          const current = parsed[i];
          const previous = parsed[i - 1];
          const cmp = compareVersions(previous, current);
          if (cmp < 0) {
            // strictly increasing — ok
            continue;
          }
          if (cmp === 0) {
            // Same effective version. The @typespec/versioning library already
            // emits its own `version-duplicate` diagnostic for identical raw
            // values, so this branch is unreachable in practice. Skip silently
            // to avoid double-reporting.
            continue;
          }
          // cmp > 0  => previous is "after" current, so current is out of order
          if (
            previous.date === current.date &&
            previous.suffix === undefined &&
            current.suffix !== undefined
          ) {
            context.reportDiagnostic({
              messageId: "previewAfterStable",
              format: {
                version: current.raw,
                previous: previous.raw,
                date: current.date,
              },
              target: current.enumMember,
            });
          } else {
            context.reportDiagnostic({
              messageId: "notMonotonic",
              format: { version: current.raw, previous: previous.raw },
              target: current.enumMember,
            });
          }
        }
      },
    };
  },
});
