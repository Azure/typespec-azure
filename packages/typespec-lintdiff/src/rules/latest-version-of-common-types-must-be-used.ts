import {
  createRule,
  paramMessage,
  type EnumMember,
  type Namespace,
  type Program,
} from "@typespec/compiler";
import {
  getArmCommonTypesVersion,
  getArmCommonTypesVersions,
  getArmProviderNamespace,
} from "@azure-tools/typespec-azure-resource-manager";
import { getAllHttpServices } from "@typespec/http";
import { getVersion } from "@typespec/versioning";

export const latestVersionOfCommonTypesMustBeUsedRule = createRule({
  name: "latest-version-of-common-types-must-be-used",
  description: "ARM services must use the latest available ARM common-types version.",
  severity: "warning",
  messages: {
    default:
      paramMessage`Use the latest ARM common-types version '${"latestVersion"}' instead of '${"currentVersion"}'.`,
  },
  create(context) {
    return {
      root: (program) => {
        const latestVersion = getLatestArmCommonTypesVersion(program);
        if (latestVersion === undefined) {
          return;
        }

        const [services] = getAllHttpServices(program);
        for (const service of services) {
          if (!getArmProviderNamespace(program, service.namespace)) {
            continue;
          }

          const versionMap = getVersion(program, service.namespace);
          if (versionMap) {
            for (const version of versionMap.getVersions()) {
              reportIfOutdated(context, version.enumMember, latestVersion);
            }
            continue;
          }

          reportIfOutdated(context, service.namespace, latestVersion);
        }
      },
    };
  },
});

function getLatestArmCommonTypesVersion(program: Program): string | undefined {
  const allVersions = getArmCommonTypesVersions(program)?.allVersions;
  if (allVersions === undefined || allVersions.length === 0) {
    return undefined;
  }

  return allVersions.reduce((latest, version) =>
    getVersionNumber(version.name) > getVersionNumber(latest.name) ? version : latest,
  ).name;
}

function getVersionNumber(version: string): number {
  const match = /^v(\d+)$/i.exec(version);
  return match ? Number(match[1]) : Number.NEGATIVE_INFINITY;
}

function reportIfOutdated(
  context: Parameters<typeof latestVersionOfCommonTypesMustBeUsedRule.create>[0],
  target: Namespace | EnumMember,
  latestVersion: string,
): void {
  const currentVersion = getArmCommonTypesVersion(context.program, target);
  if (currentVersion === undefined || currentVersion === latestVersion) {
    return;
  }

  context.reportDiagnostic({
    target,
    format: {
      currentVersion,
      latestVersion,
    },
  });
}
