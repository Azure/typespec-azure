import { Operation, createRule } from "@typespec/compiler";
import { getResponsesForOperation } from "@typespec/http";
import { isAzureSubNamespace, isTemplatedInterfaceOperation } from "./utils.js";

export const noResponseBodyRule = createRule({
  name: "no-response-body",
  description: "Ensure that the body is set correctly for the response type.",
  severity: "warning",
  messages: {
    default: `The body of non-204 responses should not be empty.`,
    response204: `The body of 204 response should be empty.`,
  },
  create(context) {
    return {
      operation: (op: Operation) => {
        if (isTemplatedInterfaceOperation(op)) return;
        if (!isAzureSubNamespace(context.program, op.namespace)) return;

        const responses = getResponsesForOperation(context.program, op)[0].find(
          (v) => v.statusCodes !== 204,
        );
        if (responses && !responses.responses.every((v) => v.body)) {
          context.reportDiagnostic({
            target: op,
          });
        }
        const responses204 = getResponsesForOperation(context.program, op)[0].find(
          (v) => v.statusCodes === 204,
        );
        if (responses204 && responses204.responses.some((v) => v.body)) {
          context.reportDiagnostic({
            target: op,
            messageId: "response204",
          });
        }
      },
    };
  },
});
