import { createRule, fileRef, paramMessage } from "@typespec/compiler";
import { getAllHttpServices } from "@typespec/http";
import { createTCGCContext } from "../context.js";
import { AllScopes } from "../internal-utils.js";
import { getLibraryName } from "../public-utils.js";

export const useUpdateForPatchRule = createRule({
  name: "use-update-for-patch",
  description: "ARM PATCH SDK method names should use 'update' as the verb prefix.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/use-update-for-patch",
  docs: fileRef.fromPackageRoot("src/rules/use-update-for-patch.md"),
  messages: {
    default: paramMessage`PATCH SDK method name '${"operationName"}' should start with 'update'. Note: If you have already shipped an SDK on top of this spec, fixing this warning may introduce a breaking change.`,
  },
  create(context) {
    const tcgcContext = createTCGCContext(
      context.program,
      "@azure-tools/typespec-client-generator-core",
      { mutateNamespace: false },
    );

    return {
      root: () => {
        const [services] = getAllHttpServices(context.program);
        for (const service of services) {
          for (const { operation, verb } of service.operations) {
            if (verb !== "patch") {
              continue;
            }

            // Check the common SDK name, leaving emitter-specific overrides to emitter rules.
            const operationName = getLibraryName(tcgcContext, operation, AllScopes);
            if (operationName.toLowerCase().startsWith("update")) {
              continue;
            }

            context.reportDiagnostic({
              target: operation,
              format: { operationName },
            });
          }
        }
      },
    };
  },
});
