import { createRule, fileRef, paramMessage } from "@typespec/compiler";
import { getAllHttpServices } from "@typespec/http";

export const useCreateForPutRule = createRule({
  name: "use-create-for-put",
  description: "ARM PUT operations should use 'create' as the operation name prefix.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/use-create-for-put",
  docs: fileRef.fromPackageRoot("src/rules/use-create-for-put.md"),
  messages: {
    default: paramMessage`'PUT' operation '${"operationName"}' should use method name 'create'. Note: If you have already shipped an SDK on top of this spec, fixing this warning may introduce a breaking change.`,
  },
  create(context) {
    return {
      root: () => {
        const [services] = getAllHttpServices(context.program);
        for (const service of services) {
          for (const { operation, verb } of service.operations) {
            if (verb !== "put" || operation.name.toLowerCase().startsWith("create")) {
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
