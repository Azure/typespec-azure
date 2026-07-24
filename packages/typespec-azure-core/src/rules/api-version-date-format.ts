import { createRule, fileRef, listServices, paramMessage } from "@typespec/compiler";
import { getVersion } from "@typespec/versioning";

/**
 * Matches `YYYY-MM-DD` optionally followed by a `-preview` suffix.
 */
const apiVersionPattern = /^(\d{4})-(\d{2})-(\d{2})(-preview)?$/;

/**
 * Returns true if the year/month/day triplet is a real calendar date.
 */
function isRealDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export const apiVersionDateFormatRule = createRule({
  name: "api-version-date-format",
  description:
    "Service API versions must use YYYY-MM-DD date format with an optional -preview suffix.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/api-version-date-format",
  docs: fileRef.fromPackageRoot("src/rules/api-version-date-format.md"),
  messages: {
    default: paramMessage`API version "${"version"}" must use the "YYYY-MM-DD" date format, optionally followed by a "-preview" suffix. For example "2022-11-18" or "2022-11-18-preview".`,
    invalidDate: paramMessage`API version "${"version"}" is not a valid date. Use a real "YYYY-MM-DD" date, optionally followed by a "-preview" suffix.`,
  },
  create(context) {
    return {
      root: (program) => {
        for (const service of listServices(program)) {
          const versions = getVersion(program, service.type)?.getVersions();
          if (versions === undefined) continue;

          for (const version of versions) {
            const match = apiVersionPattern.exec(version.value);
            if (match === null) {
              context.reportDiagnostic({
                format: { version: version.value },
                target: version.enumMember,
              });
              continue;
            }

            const [, year, month, day] = match;
            if (!isRealDate(Number(year), Number(month), Number(day))) {
              context.reportDiagnostic({
                messageId: "invalidDate",
                format: { version: version.value },
                target: version.enumMember,
              });
            }
          }
        }
      },
    };
  },
});
