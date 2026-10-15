import {
  createRule,
  fileRef,
  getService,
  isTemplateDeclarationOrInstance,
  paramMessage,
} from "@typespec/compiler";
import { getHttpOperation, type HttpStatusCodeRange } from "@typespec/http";
import { isStatusCodeAllowed, matchesStatusCode } from "./http-response-utils.js";
import { isTemplatedInterfaceOperation } from "./utils.js";

const allowedStatusCodes = new Set<number | "*">([200, 201, 202, 204, "*"]);
const allowedGetStatusCodes = new Set<number | "*">([200, 202, "*"]);

export const useStandardResponseCodesRule = createRule({
  name: "use-standard-response-codes",
  docs: fileRef.fromPackageRoot("src/rules/use-standard-response-codes.md"),
  description:
    "Use standard ARM response codes; GET operations in services must include 200 and may only add 202 or default.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/use-standard-response-codes",
  messages: {
    default: paramMessage`Operation '${"operationName"}' defines disallowed response status '${"statusCode"}'. Use only 200, 201, 202, 204, or default responses.`,
    get: "GET operations must include a 200 response and may only use 202 and default as additional response codes.",
    emptyGet: "GET operations must declare at least one response and include a 200 response.",
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

        const [httpOperation] = getHttpOperation(context.program, operation);
        let namespace = operation.namespace;
        while (namespace && !getService(context.program, namespace)) {
          namespace = namespace.namespace;
        }
        if (httpOperation.verb === "get" && namespace) {
          const has200 = httpOperation.responses.some(({ statusCodes }) =>
            matchesStatusCode(statusCodes, 200),
          );
          const hasOnlyAllowedCodes = httpOperation.responses.every(({ statusCodes }) =>
            isStatusCodeAllowed(statusCodes, allowedGetStatusCodes),
          );
          if (!has200 || !hasOnlyAllowedCodes) {
            context.reportDiagnostic({
              target: operation,
              messageId: httpOperation.responses.length === 0 ? "emptyGet" : "get",
            });
          }
          return;
        }

        for (const response of httpOperation.responses) {
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
