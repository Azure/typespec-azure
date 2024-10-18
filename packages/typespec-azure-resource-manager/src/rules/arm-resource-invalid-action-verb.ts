import { Operation, createRule } from "@typespec/compiler";
import { getOperationVerb } from "@typespec/http";
import { getActionDetails } from "@typespec/rest";

export const armResourceInvalidActionVerbRule = createRule({
  name: "arm-resource-invalid-action-verb",
  severity: "warning",
  description: "Actions must be HTTP Post operations.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/arm-resource-invalid-action-verb",
  messages: {
    default: "Actions must be HTTP Post operations.",
  },
  create(context) {
    return {
      operation: (operation: Operation) => {
        const actionType = getActionDetails(context.program, operation);
        const verb = getOperationVerb(context.program, operation);
        if (actionType !== undefined && verb !== "post") {
          context.reportDiagnostic({
            target: operation,
          });
        }
      },
    };
  },
});
