import { createRule, fileRef, paramMessage } from "@typespec/compiler";
import { getAllHttpServices } from "@typespec/http";
import { createTCGCContext } from "../context.js";
import { AllScopes } from "../internal-utils.js";
import { getLibraryName } from "../public-utils.js";

export const useCreateForPutRule = createRule({
  name: "use-create-for-put",
  description: "ARM PUT SDK method names should use 'create' as the verb prefix.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/use-create-for-put",
  docs: fileRef.fromPackageRoot("src/rules/use-create-for-put.md"),
  messages: {
    default: paramMessage`PUT SDK method name '${"operationName"}' should start with 'create'. Note: If you have already shipped an SDK on top of this spec, fixing this warning may introduce a breaking change.`,
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
            if (verb !== "put") {
              continue;
            }

            // Check the common SDK name, leaving emitter-specific overrides to emitter rules.
            const operationName = getLibraryName(tcgcContext, operation, AllScopes);
            if (operationName.toLowerCase().startsWith("create")) {
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
