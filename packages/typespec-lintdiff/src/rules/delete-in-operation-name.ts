import { createRule, paramMessage } from "@typespec/compiler";
import { getAllHttpServices } from "@typespec/http";

export const deleteInOperationNameRule = createRule({
  name: "delete-in-operation-name",
  description: "DELETE operations should use 'delete' as the operation name prefix.",
  severity: "warning",
  messages: {
    default: paramMessage`DELETE operation '${"operationName"}' should start with 'delete'.`,
  },
  create(context) {
    return {
      root: () => {
        const [services] = getAllHttpServices(context.program);
        for (const service of services) {
          for (const { operation, verb } of service.operations) {
            if (verb !== "delete" || operation.name.toLowerCase().startsWith("delete")) {
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
