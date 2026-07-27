import { createRule, paramMessage } from "@typespec/compiler";
import { getArmProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import { getAllHttpServices } from "@typespec/http";
import { getVersion } from "@typespec/versioning";

export const previewVersionOverOneYearRule = createRule({
  name: "preview-version-over-one-year",
  description:
    "ARM preview API versions older than one year should be moved to GA or retired.",
  severity: "warning",
  messages: {
    default:
      paramMessage`Preview API version '${"version"}' has been in preview for over one year. Move it to GA or retire it.`,
  },
  create(context) {
    return {
      root: (program) => {
        const [services] = getAllHttpServices(program);
        for (const service of services) {
          if (!getArmProviderNamespace(program, service.namespace)) {
            continue;
          }

          const versionMap = getVersion(program, service.namespace);
          if (versionMap === undefined) {
            continue;
          }

          for (const version of versionMap.getVersions()) {
            if (!isPreviewVersionOverOneYear(version.value)) {
              continue;
            }

            context.reportDiagnostic({
              target: version.enumMember,
              format: {
                version: version.value,
              },
            });
          }
        }
      },
    };
  },
});

function isPreviewVersionOverOneYear(version: string): boolean {
  const match = /^(\d{4}-\d{2}-\d{2})-preview$/.exec(version);
  if (!match) {
    return false;
  }

  return match[1] <= getOneYearAgoDate();
}

function getOneYearAgoDate(): string {
  const dateNow = new Date(Date.now());
  return new Date(
    dateNow.getFullYear() - 1,
    dateNow.getMonth(),
    dateNow.getDate(),
  ).toISOString().substring(0, 10);
}
