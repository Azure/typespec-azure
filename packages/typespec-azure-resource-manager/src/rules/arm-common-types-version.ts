import { Program, SemanticNodeListener, createRule } from "@typespec/compiler";
import { getAllHttpServices } from "@typespec/http";
import { getVersion } from "@typespec/versioning";
import { getArmProviderNamespace } from "../namespace.js";

/**
 * The @armCommonTypesVersion decorator should be used to set the ARM
 * common-types version used by the service.
 */
export const armCommonTypesVersionRule = createRule({
  name: "arm-common-types-version",
  severity: "warning",
  description: "Specify the ARM common-types version using @armCommonTypesVersion.",
  messages: {
    default:
      "Specify the ARM common-types version using the @armCommonTypesVersion decorator on the service namespace or on each version of the service version enum.",
  },
  create(context): SemanticNodeListener {
    return {
      root: (program: Program) => {
        const [services, _] = getAllHttpServices(program);
        for (const service of services) {
          if (!getArmProviderNamespace(program, service.namespace)) {
            continue;
          }

          const versionMap = getVersion(program, service.namespace);
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
            !service.namespace.decorators.find(
              (x) => x.definition?.name === "@armCommonTypesVersion",
            )
          ) {
            context.reportDiagnostic({
              target: service.namespace,
            });
          }
        }
      },
    };
  },
});
