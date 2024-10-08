import { Operation, createRule } from "@typespec/compiler";
import { getOperationVerb } from "@typespec/http";

import { getActionDetails } from "@typespec/rest";
import { isInternalTypeSpec, isSourceOperationResourceManagerInternal } from "./utils.js";

export const invalidActionVerbRule = createRule({
  name: "arm-resource-invalid-action-verb",
  severity: "warning",
  description: "Actions must be HTTP Post operations.",
  messages: {
    default: "Actions must be HTTP Post operations.",
  },
  create(context) {
    return {
      operation: (operation: Operation) => {
        if (
          !isInternalTypeSpec(context.program, operation) &&
          !isSourceOperationResourceManagerInternal(operation)
        ) {
          const actionType = getActionDetails(context.program, operation);
          const verb = getOperationVerb(context.program, operation);
          if (actionType !== undefined && verb !== "post") {
            context.reportDiagnostic({
              target: operation,
            });
          }
        }
      },
    };
  },
});
