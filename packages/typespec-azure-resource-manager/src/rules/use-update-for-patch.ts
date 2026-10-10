import { createRule, fileRef, paramMessage } from "@typespec/compiler";
import { getAllHttpServices } from "@typespec/http";

export const useUpdateForPatchRule = createRule({
  name: "use-update-for-patch",
  docs: fileRef.fromPackageRoot("src/rules/use-update-for-patch.md"),
  description: "ARM PATCH operation names should start with 'update'.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/use-update-for-patch",
  severity: "warning",
  messages: {
    default: paramMessage`ARM PATCH operation '${"operationName"}' should start with 'update'.`,
  },
  create(context) {
    return {
      root: () => {
        const [services] = getAllHttpServices(context.program);
        for (const service of services) {
          for (const { operation, verb } of service.operations) {
            if (verb !== "patch" || operation.name.toLowerCase().startsWith("update")) {
              continue;
            }

            context.reportDiagnostic({
              target: operation,
              format: { operationName: operation.name },
            });
          }
        }
      },
    };
  },
});
