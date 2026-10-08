import { getArmProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import { createRule, paramMessage } from "@typespec/compiler";
import { getAllHttpServices } from "@typespec/http";

export const putInOperationNameRule = createRule({
  name: "put-in-operation-name",
  description: "ARM PUT operations should use 'create' as the operation name prefix.",
  severity: "warning",
  messages: {
    default: paramMessage`'PUT' operation '${"operationName"}' should use method name 'create'. Note: If you have already shipped an SDK on top of this spec, fixing this warning may introduce a breaking change.`,
  },
  create(context) {
    return {
      root: () => {
        const [services] = getAllHttpServices(context.program);
        for (const service of services) {
          // Lintdiff enables ARM and data-plane rules together.
          if (!getArmProviderNamespace(context.program, service.namespace)) {
            continue;
          }

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
