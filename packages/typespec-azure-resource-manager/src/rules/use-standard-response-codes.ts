import { getLroMetadata } from "@azure-tools/typespec-azure-core";
import {
  createRule,
  fileRef,
  getService,
  isTemplateDeclarationOrInstance,
  paramMessage,
} from "@typespec/compiler";
import {
  getHttpOperation,
  type HttpOperationResponse,
  type HttpStatusCodeRange,
} from "@typespec/http";
import { getArmProviderNamespace } from "../namespace.js";
import { isStatusCodeAllowed, matchesStatusCode } from "./http-response-utils.js";
import { isTemplatedInterfaceOperation } from "./utils.js";

const allowedStatusCodes = new Set<number | "*">([200, 201, 202, 204, "*"]);
const allowedGetStatusCodes = new Set<number | "*">([200, 202, "*"]);
const syncPatchStatusCodes = new Set<number | "*">([200, "*"]);
const lroPatchStatusCodes = new Set<number | "*">([200, 202, "*"]);

export const useStandardResponseCodesRule = createRule({
  name: "use-standard-response-codes",
  docs: fileRef.fromPackageRoot("src/rules/use-standard-response-codes.md"),
  description:
    "Use standard ARM response codes, including method-specific requirements for service GET and ARM PATCH operations.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/use-standard-response-codes",
  messages: {
    default: paramMessage`Operation '${"operationName"}' defines disallowed response status '${"statusCode"}'. Use only 200, 201, 202, 204, or default responses.`,
    get: "GET operations must include a 200 response and may only use 202 and default as additional response codes.",
    emptyGet: "GET operations must declare at least one response and include a 200 response.",
    syncPatch:
      "Synchronous PATCH operations must have only a 200 response and a standard error response.",
    lroPatch:
      "Long-running PATCH operations must have only 200, 202, and a standard error response.",
    emptyPatch: "PATCH operations must have at least one response.",
    patchAcceptedBody: "The 202 response of a long-running PATCH operation must not have a body.",
  },
  create(context) {
    return {
      operation: (operation) => {
        if (
          isTemplateDeclarationOrInstance(operation) ||
          isTemplatedInterfaceOperation(operation)
        ) {
          return;
        }

        const { program } = context;
        const [{ verb, responses }] = getHttpOperation(program, operation);
        if (
          verb === "patch" &&
          operation.namespace &&
          getArmProviderNamespace(program, operation.namespace)
        ) {
          if (responses.length === 0) {
            context.reportDiagnostic({ target: operation, messageId: "emptyPatch" });
            return;
          }

          const isLongRunning = getLroMetadata(program, operation) !== undefined;
          const expected = isLongRunning ? lroPatchStatusCodes : syncPatchStatusCodes;
          if (!hasExactlyResponses(responses, expected)) {
            context.reportDiagnostic({
              target: operation,
              messageId: isLongRunning ? "lroPatch" : "syncPatch",
            });
          }
          if (
            isLongRunning &&
            responses.some(
              ({ statusCodes, responses: variants }) =>
                matchesStatusCode(statusCodes, 202) &&
                variants.some(({ body }) => body !== undefined),
            )
          ) {
            context.reportDiagnostic({ target: operation, messageId: "patchAcceptedBody" });
          }
          return;
        }

        let namespace = operation.namespace;
        while (namespace && !getService(program, namespace)) {
          namespace = namespace.namespace;
        }
        if (verb === "get" && namespace) {
          const has200 = responses.some(({ statusCodes }) => matchesStatusCode(statusCodes, 200));
          const hasOnlyAllowedCodes = responses.every(({ statusCodes }) =>
            isStatusCodeAllowed(statusCodes, allowedGetStatusCodes),
          );
          if (!has200 || !hasOnlyAllowedCodes) {
            context.reportDiagnostic({
              target: operation,
              messageId: responses.length === 0 ? "emptyGet" : "get",
            });
          }
          return;
        }

        for (const response of responses) {
          if (!isStatusCodeAllowed(response.statusCodes, allowedStatusCodes)) {
            context.reportDiagnostic({
              target: operation,
              format: {
                operationName: operation.name,
                statusCode: formatStatusCode(response.statusCodes),
              },
            });
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
  for (const { statusCodes } of responses) {
    if (!isStatusCodeAllowed(statusCodes, expected)) return false;
    actual.add(typeof statusCodes === "object" ? statusCodes.start : statusCodes);
  }
  return actual.size === expected.size;
}

function formatStatusCode(statusCode: number | "*" | HttpStatusCodeRange): string {
  if (statusCode === "*") {
    return "default";
  }
  if (typeof statusCode === "number") {
    return String(statusCode);
  }
  return statusCode.start === statusCode.end
    ? String(statusCode.start)
    : `${statusCode.start}-${statusCode.end}`;
}
