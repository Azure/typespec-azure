import {
  type Program,
  type SemanticNodeListener,
  createRule,
  fileRef,
  listServices,
  paramMessage,
} from "@typespec/compiler";
import { getVersion } from "@typespec/versioning";
import { getArmCommonTypesVersion, getArmCommonTypesVersions } from "../common-types.js";
import { getArmProviderNamespace } from "../namespace.js";

/**
 * The @armCommonTypesVersion decorator should select the latest ARM common-types version.
 */
export const armCommonTypesVersionRule = createRule({
  name: "arm-common-types-version",
  docs: fileRef.fromPackageRoot("src/rules/arm-common-types-version.md"),
  severity: "warning",
  description: "Specify the latest ARM common-types version using @armCommonTypesVersion.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/arm-common-types-version",
  messages: {
    default:
      "Specify the ARM common-types version using the @armCommonTypesVersion decorator on the service namespace or on each version of the service version enum.",
    outdated: paramMessage`Use the latest ARM common-types version '${"latestVersion"}' instead of '${"currentVersion"}'.`,
  },
  create(context): SemanticNodeListener {
    return {
      root: (program: Program) => {
        // The common-types registry stores versions newest first.
        const latestVersion = getArmCommonTypesVersions(program)?.allVersions[0]?.name;
        for (const { type: namespace } of listServices(program)) {
          if (!getArmProviderNamespace(program, namespace)) {
            continue;
          }

          const versionMap = getVersion(program, namespace);
          // If the namespace is versioned and not all versions have the
          // common-types version and if the service namespace doesn't have a
          // common-types version, raise a diagnostic.
          if (
            !(
              versionMap &&
              versionMap
                .getVersions()
                .every(
                  (version) =>
                    !!version.enumMember.decorators.find(
                      (x) => x.definition?.name === "@armCommonTypesVersion",
                    ),
                )
            ) &&
            !namespace.decorators.find((x) => x.definition?.name === "@armCommonTypesVersion")
          ) {
            context.reportDiagnostic({
              messageId: "default",
              target: namespace,
            });
            continue;
          }

          if (latestVersion === undefined) {
            continue;
          }

          const namespaceVersion = getArmCommonTypesVersion(program, namespace);
          const targets = versionMap
            ? versionMap.getVersions().map((version) => version.enumMember)
            : [namespace];
          for (const target of targets) {
            const currentVersion = getArmCommonTypesVersion(program, target) ?? namespaceVersion;
            if (currentVersion !== undefined && currentVersion !== latestVersion) {
              context.reportDiagnostic({
                messageId: "outdated",
                target,
                format: { latestVersion, currentVersion },
              });
            }
          }
        }
      },
    };
  },
});
