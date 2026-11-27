import {
  createRule,
  fileRef,
  getService,
  isTemplateDeclarationOrInstance,
  paramMessage,
  type Operation,
  type Program,
} from "@typespec/compiler";
import {
  getHttpOperation,
  type HttpOperation,
  type HttpOperationResponse,
  type HttpStatusCodeRange,
} from "@typespec/http";
import { isTemplatedInterfaceOperation } from "./utils.js";

interface ResponsePolicy {
  readonly messageId: "get";
  /** Matches any alternative, requiring every `required` code and allowing only `required` and `optional` codes. */
  readonly allowed: readonly {
    readonly required: readonly number[];
    readonly optional?: readonly number[];
  }[];
}

const servicePolicies: Partial<Record<HttpOperation["verb"], ResponsePolicy>> = {
  get: {
    messageId: "get",
    allowed: [{ required: [200], optional: [202] }],
  },
};

const allowedStatusCodes = new Set([200, 201, 202, 204]);

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
        const policy = getResponsePolicy(context.program, operation, httpOperation);
        if (policy) {
          if (!matchesPolicy(httpOperation.responses, policy)) {
            context.reportDiagnostic({
              target: operation,
              messageId:
                policy === servicePolicies.get && httpOperation.responses.length === 0
                  ? "emptyGet"
                  : policy.messageId,
            });
          }
          return;
        }

        for (const response of httpOperation.responses) {
          if (response.statusCodes === "*") continue;
          const code = getStatusCode(response.statusCodes);
          if (code === undefined || !allowedStatusCodes.has(code)) {
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

function getResponsePolicy(
  program: Program,
  operation: Operation,
  httpOperation: HttpOperation,
): ResponsePolicy | undefined {
  const policy = servicePolicies[httpOperation.verb];
  if (!policy) return undefined;
  for (let ns = operation.namespace; ns; ns = ns.namespace) {
    if (getService(program, ns)) return policy;
  }
  return undefined;
}

function matchesPolicy(
  responses: readonly HttpOperationResponse[],
  policy: ResponsePolicy,
): boolean {
  const codes = new Set<number>();
  for (const response of responses) {
    if (response.statusCodes === "*") continue;
    const code = getStatusCode(response.statusCodes);
    if (code === undefined) return false;
    codes.add(code);
  }
  return policy.allowed.some(
    ({ required, optional = [] }) =>
      required.every((code) => codes.has(code)) &&
      [...codes].every((code) => required.includes(code) || optional.includes(code)),
  );
}

/** Returns the single status code, or `undefined` for a range that covers several codes. */
function getStatusCode(statusCode: number | HttpStatusCodeRange): number | undefined {
  if (typeof statusCode === "number") return statusCode;
  return statusCode.start === statusCode.end ? statusCode.start : undefined;
}

function formatStatusCode(statusCode: number | HttpStatusCodeRange): string {
  if (typeof statusCode === "number") {
    return String(statusCode);
  }
  return statusCode.start === statusCode.end
    ? String(statusCode.start)
    : `${statusCode.start}-${statusCode.end}`;
}
