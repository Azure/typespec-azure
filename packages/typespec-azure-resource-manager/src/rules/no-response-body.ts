import { isAzureSubNamespace } from "@azure-tools/typespec-azure-core";
import { createRule, Operation } from "@typespec/compiler";
import { getResponsesForOperation, HttpOperationResponse } from "@typespec/http";
import { isTemplatedInterfaceOperation } from "./utils.js";
/**
 * verify an operation returns 202 or 204 should not contain response body.
 * verify that operations that are different for 202 and 204 should contain a response body.
 */
export const noResponseBodyRule = createRule({
  name: "no-response-body",
  description:
    "Check that the body is empty for 202 and 204 responses, and not empty for other success (2xx) responses.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/no-response-body",
  severity: "warning",
  messages: {
    default: `The body of responses with success (2xx) status codes other than 202 and 204 should not be empty.`,
    shouldBeEmpty202: `The body of 202 response should be empty.`,
    shouldBeEmpty204: `The body of 204 response should be empty.`,
  },
  create(context) {
    return {
      operation: (op: Operation) => {
        if (isTemplatedInterfaceOperation(op)) return;
        if (!isAzureSubNamespace(context.program, op.namespace)) return;

        const responses = getResponsesForOperation(context.program, op)[0].find(
          (v) => v.statusCodes !== 204 && v.statusCodes !== 202,
        );
        if (responses && !responses.responses.every((v) => v.body)) {
          context.reportDiagnostic({
            target: op,
          });
        }

        if (hasResponseBodyForCode(202, getResponsesForOperation(context.program, op)[0])) {
          context.reportDiagnostic({
            target: op,
            messageId: "shouldBeEmpty202",
          });
        }

        if (hasResponseBodyForCode(204, getResponsesForOperation(context.program, op)[0])) {
          context.reportDiagnostic({
            target: op,
            messageId: "shouldBeEmpty204",
          });
        }
      },
    };
  },
});

function hasResponseBodyForCode(statusCode: number, operations: HttpOperationResponse[]): boolean {
  const response = operations.find((v) => v.statusCodes === statusCode);
  return !!(response && response.responses.some((v) => v.body));
}
