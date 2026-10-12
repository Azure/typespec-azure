import { createRule, fileRef, paramMessage } from "@typespec/compiler";
import { getAllHttpServices } from "@typespec/http";
import { createTCGCContext } from "../context.js";
import { AllScopes } from "../internal-utils.js";
import { getLibraryName } from "../public-utils.js";

export const useDeleteForDeleteRule = createRule({
  name: "use-delete-for-delete",
  description: "DELETE SDK method names should use 'delete' as the verb prefix.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/use-delete-for-delete",
  docs: fileRef.fromPackageRoot("src/rules/use-delete-for-delete.md"),
  messages: {
    default: paramMessage`DELETE SDK method name '${"operationName"}' should start with 'delete'.`,
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
            if (verb !== "delete") {
              continue;
            }

            const operationName = getLibraryName(tcgcContext, operation, AllScopes);
            if (operationName.toLowerCase().startsWith("delete")) {
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
