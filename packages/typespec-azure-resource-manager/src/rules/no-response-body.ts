import { Operation, createRule } from "@typespec/compiler";
import { getResponsesForOperation } from "@typespec/http";

import { isTemplatedInterfaceOperation } from "./utils.js";

/**
 * verify an operation returns 202 should not contains response body.
 */
export const noResponseBodyRule = createRule({
  name: "no-response-body",
  severity: "warning",
  description: `The body of 202 response should be empty.`,
  messages: {
    default: `The body of 202 response should be empty.`,
  },
  create(context) {
    return {
      operation: (op: Operation) => {
        if (isTemplatedInterfaceOperation(op)) {
          return;
        }
        const responses = getResponsesForOperation(context.program, op)[0].find(
          (v) => v.statusCodes === 202,
        );
        if (responses && responses.responses.some((v) => v.body)) {
          context.reportDiagnostic({
            target: op,
          });
        }
      },
    };
  },
});
