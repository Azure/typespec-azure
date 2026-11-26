import { getLroMetadata } from "@azure-tools/typespec-azure-core";
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
import { getArmResourceOperationData } from "../operations.js";
import { isTemplatedInterfaceOperation } from "./utils.js";

interface ResponsePolicy {
  readonly messageId: "get" | "deleteSync" | "deleteAsync" | "put" | "postSync" | "postAsync";
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

const resourcePolicies: Partial<
  Record<HttpOperation["verb"], { sync: ResponsePolicy; lro: ResponsePolicy }>
> = {
  delete: {
    sync: { messageId: "deleteSync", allowed: [{ required: [200, 204] }] },
    lro: { messageId: "deleteAsync", allowed: [{ required: [202, 204] }] },
  },
  put: {
    sync: { messageId: "put", allowed: [{ required: [200, 201] }] },
    lro: { messageId: "put", allowed: [{ required: [200, 201] }] },
  },
  post: {
    sync: { messageId: "postSync", allowed: [{ required: [200] }, { required: [204] }] },
    lro: {
      messageId: "postAsync",
      allowed: [{ required: [202], optional: [200] }],
      body: { 200: true, 202: false },
    },
  },
};

const allowedStatusCodes = new Set([200, 201, 202, 204]);

export const useStandardResponseCodesRule = createRule({
  name: "use-standard-response-codes",
  docs: fileRef.fromPackageRoot("src/rules/use-standard-response-codes.md"),
  description:
    "Use standard ARM response codes for GET, DELETE, PUT, POST, and other HTTP operations.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/use-standard-response-codes",
  messages: {
    default: paramMessage`Operation '${"operationName"}' defines disallowed response status '${"statusCode"}'. Use only 200, 201, 202, 204, or default responses.`,
    get: "GET operations must include a 200 response and may only use 202 and default as additional response codes.",
    emptyGet: "GET operations must declare at least one response and include a 200 response.",
    deleteSync: `Synchronous delete operations must have 200 and 204 responses. They must not have any other response codes. Consider using the 'ArmResourceDeleteSync' template.`,
    deleteAsync: `Long-running delete operations must have 202 and 204 responses. They must not have any other response codes. Consider using the 'ArmResourceDeleteWithoutOkAsync' template.`,
    put: `Put operations must have 200 and 201 responses. They must not have any other response codes.`,
    postSync: `Synchronous post operations must have either a 200 or 204 response. They must not have any other response codes.`,
    postAsync: `Long-running post operations must have a 202 response without a body and may have a 200 response with a body. They must not have any other response codes.`,
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
            return;
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
  const kind = getArmResourceOperationData(program, operation)?.kind;
  if (kind === "delete" || kind === "createOrUpdate" || kind === "update" || kind === "action") {
    const policies = resourcePolicies[httpOperation.verb];
    if (policies && (kind !== "delete" || httpOperation.verb === "delete")) {
      return getLroMetadata(program, operation) ? policies.lro : policies.sync;
    }
  }
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
