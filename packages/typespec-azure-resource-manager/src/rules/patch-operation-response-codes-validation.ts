import { getLroMetadata } from "@azure-tools/typespec-azure-core";
import { createRule, fileRef, getOverloadedOperation, type Operation } from "@typespec/compiler";
import { getHttpOperation, getOperationVerb, type HttpOperationResponse } from "@typespec/http";
import { getArmProviderNamespace } from "../namespace.js";
import { isStatusCodeAllowed, matchesStatusCode } from "./http-response-utils.js";

const syncResponses = new Set<number | "*">([200, "*"]);
const lroResponses = new Set<number | "*">([200, 202, "*"]);

export const patchOperationResponseCodesRule = createRule({
  name: "patch-operation-response-codes-validation",
  docs: fileRef.fromPackageRoot("src/rules/patch-operation-response-codes-validation.md"),
  description: "Ensure ARM PATCH operations have the appropriate response codes.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/patch-operation-response-codes-validation",
  messages: {
    sync: "Synchronous PATCH operations must have only a 200 response and a standard error response.",
    async: "Long-running PATCH operations must have only 200, 202, and a standard error response.",
    empty: "PATCH operations must have at least one response.",
    acceptedBody: "The 202 response of a long-running PATCH operation must not have a body.",
  },
  create(context) {
    return {
      operation(operation: Operation) {
        const program = context.program;
        if (
          operation.namespace === undefined ||
          getArmProviderNamespace(program, operation.namespace) === undefined
        ) {
          return;
        }

        const verb = getOperationVerb(program, operation);
        if (
          verb !== "patch" &&
          (verb !== undefined || !getOverloadedOperation(program, operation))
        ) {
          return;
        }

        const [httpOperation] = getHttpOperation(program, operation);
        if (httpOperation.verb !== "patch") return;
        const responses = httpOperation.responses;
        if (responses.length === 0) {
          context.reportDiagnostic({ target: operation, messageId: "empty" });
          return;
        }

        const isAsync = getLroMetadata(program, operation) !== undefined;
        if (isAsync) {
          if (!hasExactlyResponses(responses, lroResponses)) {
            context.reportDiagnostic({ target: operation, messageId: "async" });
          }
          if (
            responses.some(
              (response) =>
                matchesStatusCode(response.statusCodes, 202) &&
                response.responses.some((content) => content.body !== undefined),
            )
          ) {
            context.reportDiagnostic({ target: operation, messageId: "acceptedBody" });
          }
        } else if (!hasExactlyResponses(responses, syncResponses)) {
          context.reportDiagnostic({ target: operation, messageId: "sync" });
        }
      },
    };
  },
});

function hasExactlyResponses(
  responses: HttpOperationResponse[],
  expected: ReadonlySet<number | "*">,
): boolean {
  const actual = new Set<number | "*">();
  for (const response of responses) {
    const status = response.statusCodes;
    if (!isStatusCodeAllowed(status, expected)) return false;
    actual.add(typeof status === "object" ? status.start : status);
  }
  return actual.size === expected.size && [...expected].every((status) => actual.has(status));
}
