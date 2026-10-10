import { getArmProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import { createRule, paramMessage } from "@typespec/compiler";
import { getAllHttpServices } from "@typespec/http";

export const patchInOperationNameRule = createRule({
  name: "patch-in-operation-name",
  description: "ARM PATCH operations should use 'update' as the operation name prefix.",
  severity: "warning",
  messages: {
    default: paramMessage`ARM PATCH operation '${"operationName"}' should start with 'update'.`,
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
