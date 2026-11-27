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
import { matchesStatusCode } from "./http-response-utils.js";
import { isTemplatedInterfaceOperation } from "./utils.js";

const allowedStatusCodes = new Set<number>([200, 201, 202, 204]);
const allowedGetStatusCodes = new Set<number>([200, 202]);
const syncPatchStatusCodes = new Set<number>([200]);
const lroPatchStatusCodes = new Set<number>([200, 202]);

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
    syncPatch: "Synchronous PATCH operations must use 200 and no other numeric response codes.",
    lroPatch:
      "Long-running PATCH operations must use 200 and 202 and no other numeric response codes.",
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
          if (!hasExactlyStatusCodes(responses, expected)) {
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
          const explicitResponses = responses.filter(
            (
              response,
            ): response is HttpOperationResponse & {
              statusCodes: number | HttpStatusCodeRange;
            } => isExplicitStatusCode(response.statusCodes),
          );
          const has200 = explicitResponses.some(({ statusCodes }) =>
            matchesStatusCode(statusCodes, 200),
          );
          const hasOnlyAllowedCodes = explicitResponses.every(({ statusCodes }) =>
            isAllowedExplicitStatusCode(statusCodes, allowedGetStatusCodes),
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
          if (
            isExplicitStatusCode(response.statusCodes) &&
            !isAllowedExplicitStatusCode(response.statusCodes, allowedStatusCodes)
          ) {
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

function hasExactlyStatusCodes(
  responses: HttpOperationResponse[],
  expected: ReadonlySet<number>,
): boolean {
  const actual = new Set<number>();
  for (const { statusCodes } of responses) {
    if (!isExplicitStatusCode(statusCodes)) continue;
    if (!isAllowedExplicitStatusCode(statusCodes, expected)) return false;
    actual.add(typeof statusCodes === "object" ? statusCodes.start : statusCodes);
  }
  return actual.size === expected.size;
}

function isExplicitStatusCode(
  statusCode: HttpOperationResponse["statusCodes"],
): statusCode is number | HttpStatusCodeRange {
  return typeof statusCode === "number" || typeof statusCode === "object";
}

function isAllowedExplicitStatusCode(
  statusCode: number | HttpStatusCodeRange,
  allowed: ReadonlySet<number>,
): boolean {
  return typeof statusCode === "number"
    ? allowed.has(statusCode)
    : statusCode.start === statusCode.end && allowed.has(statusCode.start);
}

function formatStatusCode(statusCode: number | HttpStatusCodeRange): string {
  if (typeof statusCode === "number") {
    return String(statusCode);
  }
  return statusCode.start === statusCode.end
    ? String(statusCode.start)
    : `${statusCode.start}-${statusCode.end}`;
}
