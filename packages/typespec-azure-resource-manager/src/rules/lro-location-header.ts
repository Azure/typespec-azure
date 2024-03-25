import { Operation, createRule } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";

/**
 * Ensure that LRO 202 responses have a Location Header.
 */
export const lroLocationHeaderRule = createRule({
  name: "lro-location-header",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/lro-location-header",
  description: "A 202 response should include a Location response header.",
  messages: {
    default: `A 202 response should include a Location response header.`,
  },
  create(context) {
    return {
      operation: (op: Operation) => {
        const [httpOperation, _] = getHttpOperation(context.program, op);
        const responses = httpOperation.responses;
        for (const response of responses) {
          if (response.statusCodes !== 202) {
            continue;
          }
          if (response.responses.length !== 1) {
            throw new Error("Expected exactly one response for 202 status code.");
          }
          const resp = response.responses[0];
          if (resp.headers?.["Location"] === undefined) {
            context.reportDiagnostic({
              target: op,
            });
            return;
          }
        }
      },
    };
  },
});
