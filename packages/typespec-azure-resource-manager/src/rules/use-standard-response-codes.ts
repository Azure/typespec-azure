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

type StatusCode = number | "*";

/** A set of responses that is accepted: all `required` codes must be present and no codes outside `required` and `optional` are allowed. */
interface AllowedResponses {
  readonly required: readonly StatusCode[];
  readonly optional?: readonly StatusCode[];
}

interface ResponsePolicy {
  readonly messageId: "get" | "deleteSync" | "deleteAsync" | "put" | "postSync" | "postAsync";
  /** The operation is valid if it matches any of these alternatives. */
  readonly allowed: readonly AllowedResponses[];
  /** Whether a declared response with the given code must (`true`) or must not (`false`) have a body. */
  readonly body?: Readonly<Partial<Record<number, boolean>>>;
}

const getPolicy: ResponsePolicy = {
  messageId: "get",
  allowed: [{ required: [200], optional: [202, "*"] }],
};

/** Policies for ARM resource lifecycle and action operations, by HTTP verb and whether the operation is long-running. */
const resourcePolicies: Partial<
  Record<HttpOperation["verb"], { sync: ResponsePolicy; lro: ResponsePolicy }>
> = {
  delete: {
    sync: { messageId: "deleteSync", allowed: [{ required: [200, 204, "*"] }] },
    lro: { messageId: "deleteAsync", allowed: [{ required: [202, 204, "*"] }] },
  },
  put: {
    sync: { messageId: "put", allowed: [{ required: [200, 201, "*"] }] },
    lro: { messageId: "put", allowed: [{ required: [200, 201, "*"] }] },
  },
  post: {
    sync: { messageId: "postSync", allowed: [{ required: [200, "*"] }, { required: [204, "*"] }] },
    lro: {
      messageId: "postAsync",
      allowed: [{ required: [202, "*"], optional: [200] }],
      body: { 200: true, 202: false },
    },
  },
};

const allowedStatusCodes = new Set<StatusCode>([200, 201, 202, 204, "*"]);

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
    deleteSync: `Synchronous delete operations must have 200, 204 and default responses. They must not have any other responses. Consider using the 'ArmResourceDeleteSync' template.`,
    deleteAsync: `Long-running delete operations must have 202, 204 and default responses. They must not have any other responses. Consider using the 'ArmResourceDeleteWithoutOkAsync' template.`,
    put: `Put operations must have 200, 201 and default responses. They must not have any other responses.`,
    postSync: `Synchronous post operations must have a 200 or 204 response and a default response. They must not have any other responses.`,
    postAsync: `Long-running post operations must have 202 and default responses. They must also have a 200 response if the final response has a schema. They must not have any other responses.`,
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
                policy === getPolicy && httpOperation.responses.length === 0
                  ? "emptyGet"
                  : policy.messageId,
            });
          }
          return;
        }

        for (const response of httpOperation.responses) {
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
  const kind = getArmResourceOperationData(program, operation)?.kind;
  if (kind === "delete" || kind === "createOrUpdate" || kind === "update" || kind === "action") {
    const policies = resourcePolicies[httpOperation.verb];
    if (policies && (kind !== "delete" || httpOperation.verb === "delete")) {
      return getLroMetadata(program, operation) ? policies.lro : policies.sync;
    }
  }
  if (httpOperation.verb === "get" && isInService(program, operation)) {
    return getPolicy;
  }
  return undefined;
}

function isInService(program: Program, operation: Operation): boolean {
  for (let ns = operation.namespace; ns; ns = ns.namespace) {
    if (getService(program, ns)) return true;
  }
  return false;
}

function matchesPolicy(
  responses: readonly HttpOperationResponse[],
  policy: ResponsePolicy,
): boolean {
  const codes = new Set<StatusCode>();
  for (const response of responses) {
    const code = getStatusCode(response.statusCodes);
    if (code === undefined) return false;
    codes.add(code);
    const bodyRequired = typeof code === "number" ? policy.body?.[code] : undefined;
    if (
      bodyRequired !== undefined &&
      response.responses.some((r) => r.body !== undefined) !== bodyRequired
    ) {
      return false;
    }
  }
  return policy.allowed.some(
    ({ required, optional = [] }) =>
      required.every((code) => codes.has(code)) &&
      [...codes].every((code) => required.includes(code) || optional.includes(code)),
  );
}

/** Returns the single status code of a response, or `undefined` for a range that covers several codes. */
function getStatusCode(statusCode: StatusCode | HttpStatusCodeRange): StatusCode | undefined {
  if (typeof statusCode !== "object") return statusCode;
  return statusCode.start === statusCode.end ? statusCode.start : undefined;
}

function formatStatusCode(statusCode: StatusCode | HttpStatusCodeRange): string {
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
