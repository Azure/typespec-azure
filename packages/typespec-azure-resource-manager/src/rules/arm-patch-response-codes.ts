import { getLroMetadata } from "@azure-tools/typespec-azure-core";
import {
  createRule,
  fileRef,
  getOverloadedOperation,
  listOperationsIn,
  listServices,
  type Operation,
} from "@typespec/compiler";
import { getHttpOperation, getOperationVerb, type HttpOperationResponse } from "@typespec/http";
import { getArmProviderNamespace } from "../namespace.js";
import { isStatusCodeAllowed } from "./http-response-utils.js";

const syncResponses = new Set<number | "*">([200, "*"]);
const lroResponses = new Set<number | "*">([200, 202, "*"]);

export const armPatchResponseCodesRule = createRule({
  name: "arm-patch-operation-response-codes",
  docs: fileRef.fromPackageRoot("src/rules/arm-patch-operation-response-codes.md"),
  description: "Ensure ARM PATCH operations have the appropriate response codes.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/arm-patch-operation-response-codes",
  messages: {
    sync: "Synchronous PATCH operations must have only 200 and default responses.",
    async: "Long-running PATCH operations must have only 200, 202, and default responses.",
    empty: "PATCH operations must have at least one response.",
    acceptedBody: "The 202 response of a long-running PATCH operation must not have a body.",
  },
  create(context) {
    return {
      root(program) {
        const seen = new Set<Operation>();
        for (const service of listServices(program)) {
          if (getArmProviderNamespace(program, service.type) === undefined) continue;

          for (const operation of listOperationsIn(service.type)) {
            if (seen.has(operation)) continue;
            seen.add(operation);

            const verb = getOperationVerb(program, operation);
            if (
              verb !== "patch" &&
              (verb !== undefined || !getOverloadedOperation(program, operation))
            ) {
              continue;
            }

            const [httpOperation] = getHttpOperation(program, operation);
            if (httpOperation.verb !== "patch") continue;
            const responses = httpOperation.responses;
            if (responses.length === 0) {
              context.reportDiagnostic({ target: operation, messageId: "empty" });
              continue;
            }

            const isAsync = getLroMetadata(program, operation) !== undefined;
            if (isAsync) {
              if (!hasExactlyResponses(responses, lroResponses)) {
                context.reportDiagnostic({ target: operation, messageId: "async" });
              }
              if (
                responses.some(
                  (response) =>
                    response.statusCodes === 202 &&
                    response.responses.some((content) => content.body !== undefined),
                )
              ) {
                context.reportDiagnostic({ target: operation, messageId: "acceptedBody" });
              }
            } else if (!hasExactlyResponses(responses, syncResponses)) {
              context.reportDiagnostic({ target: operation, messageId: "sync" });
            }
          }
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
    if (typeof status === "object" || !isStatusCodeAllowed(status, expected)) return false;
    actual.add(status);
  }
  return actual.size === expected.size && [...expected].every((status) => actual.has(status));
}
