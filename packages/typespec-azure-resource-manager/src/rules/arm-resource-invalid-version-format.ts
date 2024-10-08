import { Namespace, createRule, paramMessage } from "@typespec/compiler";

import { getVersion } from "@typespec/versioning";
import { isInternalTypeSpec } from "./utils.js";

export const armResourceInvalidVersionFormatRule = createRule({
  name: "arm-resource-invalid-version-format",
  severity: "warning",
  description: "Check for valid versions.",
  messages: {
    default: paramMessage`The version '${"version"}' is invalid. Versions for arm resources must be of the form "YYYY-MM-DD" and may have a suffix, like "-preview" or a versioned suffix,  "-alpha.1".`,
    invalidType: paramMessage`The versions for Azure Resource Manager Services must use strings of the form "YYYY-MM-DD[-suffix]."`,
  },
  create(context) {
    return {
      namespace: (namespace: Namespace) => {
        // validate format of versions
        if (isInternalTypeSpec(context.program, namespace)) {
          return;
        }

        const map = getVersion(context.program, namespace);
        if (map !== undefined) {
          for (const version of map.getVersions()) {
            const versionValue = version.enumMember.value ?? version.enumMember.name;
            switch (typeof versionValue) {
              case "number":
              case "undefined":
                context.reportDiagnostic({
                  messageId: "invalidType",
                  format: { version: versionValue },
                  target: version.enumMember,
                });
                break;
              case "string":
                const versionMatch = versionValue.match(
                  /^[\d]{4}-[\d]{2}-[\d]{2}(-[\w]+(\.\d+)?)?$/,
                );
                if (
                  versionMatch === undefined ||
                  versionMatch === null ||
                  versionMatch.length < 1
                ) {
                  context.reportDiagnostic({
                    format: { version: versionValue },
                    target: version.enumMember,
                  });
                }
                break;
            }
          }
        }
      },
    };
  },
});
