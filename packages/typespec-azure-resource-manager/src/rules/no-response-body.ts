import { createRule, fileRef, isTemplateInstance, type Operation } from "@typespec/compiler";
import { getHttpOperation, type HttpOperationResponse } from "@typespec/http";
import { isTemplatedInterfaceOperation } from "./utils.js";
/**
 * verify that 202, 204 and DELETE 200 responses do not contain a response body.
 * verify that success (2XX) responses other than 202 and 204 contain a response body.
 */
export const noResponseBodyRule = createRule({
  name: "no-response-body",
  docs: fileRef.fromPackageRoot("src/rules/no-response-body.md"),
  description:
    "Check that 202, 204 and DELETE 200 responses have no body, and other success (2xx) responses have a body except for HEAD and POST 200.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/no-response-body",
  severity: "warning",
  messages: {
    default: `The body of responses with success (2xx) status codes other than 202 and 204 should not be empty.`,
    shouldBeEmpty200: `The body of 200 response for DELETE should be empty.`,
    shouldBeEmpty202: `The body of 202 response should be empty.`,
    shouldBeEmpty204: `The body of 204 response should be empty.`,
  },
  create(context) {
    return {
      operation: (op: Operation) => {
        if (isTemplateInstance(op) || isTemplatedInterfaceOperation(op)) return;

        const [httpOperation] = getHttpOperation(context.program, op);
        if (httpOperation.verb === "head") return;

        const responses = httpOperation.responses;
        const response = responses.find((v) => v.statusCodes !== 204 && v.statusCodes !== 202);

        if (
          response &&
          !response.responses.every((v) => v.body) &&
          !(["delete", "post"].includes(httpOperation.verb) && response.statusCodes === 200)
        ) {
          context.reportDiagnostic({
            target: op,
          });
        }

        if (httpOperation.verb === "delete" && hasResponseBodyForCode(200, responses)) {
          context.reportDiagnostic({
            target: op,
            messageId: "shouldBeEmpty200",
          });
        }

        if (hasResponseBodyForCode(202, responses)) {
          context.reportDiagnostic({
            target: op,
            messageId: "shouldBeEmpty202",
          });
        }

        if (hasResponseBodyForCode(204, responses)) {
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
