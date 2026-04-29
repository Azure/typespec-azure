import { EnumMember, Namespace, createRule, paramMessage } from "@typespec/compiler";

import { getVersion } from "@typespec/versioning";
import { isInternalTypeSpec } from "./utils.js";

interface ParsedVersion {
  enumMember: EnumMember;
  raw: string;
  date: string;
}

/**
 * Parse a version string of the form "YYYY-MM-DD[-suffix[.N]]" and return its
 * date component. Returns undefined if the string does not match the expected
 * format (the `arm-resource-invalid-version-format` rule is responsible for
 * reporting that).
 */
function parseVersionDate(value: string): string | undefined {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})(?:-[A-Za-z]+(?:\.\d+)?)?$/);
  return match ? match[1] : undefined;
}

/**
 * Validates that the versions declared on an ARM service namespace use a
 * unique date and are listed in strictly increasing chronological order. Two
 * api-versions sharing the same date (for example, `2026-04-28` and
 * `2026-04-28-preview`) are not allowed — every version's `YYYY-MM-DD` date
 * must be different from every other version's date in the same `Versions`
 * enum.
 */
export const armVersionProgressionRule = createRule({
  name: "arm-version-progression",
  severity: "warning",
  description:
    "Validate that ARM service versions all use unique dates and are declared in strictly increasing chronological order.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/arm-version-progression",
  messages: {
    notMonotonic: paramMessage`Version '${"version"}' is declared after '${"previous"}' but is not chronologically later. ARM versions must be declared in strictly increasing chronological order by date.`,
    duplicateDate: paramMessage`Version '${"version"}' has the same date as '${"previous"}'. Every ARM api-version must use a unique date — preview and stable versions cannot share the same 'YYYY-MM-DD'.`,
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
          const date = parseVersionDate(value);
          if (date === undefined) continue;
          parsed.push({ enumMember: version.enumMember, raw: value, date });
        }

        for (let i = 1; i < parsed.length; i++) {
          const current = parsed[i];
          const previous = parsed[i - 1];
          if (current.date === previous.date) {
            context.reportDiagnostic({
              messageId: "duplicateDate",
              format: { version: current.raw, previous: previous.raw },
              target: current.enumMember,
            });
          } else if (current.date < previous.date) {
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
