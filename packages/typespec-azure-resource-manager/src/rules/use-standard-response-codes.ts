import { getLroMetadata } from "@azure-tools/typespec-azure-core";
import { createRule, fileRef, paramMessage } from "@typespec/compiler";
import {
  getAllHttpServices,
  type HttpOperation,
  type HttpOperationResponse,
  type HttpStatusCodeRange,
} from "@typespec/http";

interface ResponsePolicy {
  readonly messageId: "get" | "deleteSync" | "deleteAsync" | "put" | "postSync" | "postAsync";
  /** Message used instead of `messageId` when the operation declares no responses. */
  readonly emptyMessageId?: "emptyGet";
  /** Matches any alternative, requiring every `required` code and allowing only `required` and `optional` codes. */
  readonly allowed: readonly {
    readonly required: readonly number[];
    readonly optional?: readonly number[];
  }[];
  /** Whether every variant of a declared response with the given code must (`true`) or must not (`false`) have a body. */
  readonly body?: Readonly<Partial<Record<number, boolean>>>;
}

/** Policies applied to operations inside a service namespace, keyed by HTTP verb. */
const responsePolicies: Partial<
  Record<HttpOperation["verb"], { policy: ResponsePolicy; lro?: ResponsePolicy }>
> = {
  get: {
    policy: {
      messageId: "get",
      emptyMessageId: "emptyGet",
      allowed: [{ required: [200], optional: [202] }],
    },
  },
  delete: {
    policy: { messageId: "deleteSync", allowed: [{ required: [200, 204] }] },
    lro: { messageId: "deleteAsync", allowed: [{ required: [202, 204] }] },
  },
  put: {
    policy: { messageId: "put", allowed: [{ required: [200, 201] }] },
  },
  post: {
    policy: { messageId: "postSync", allowed: [{ required: [200] }, { required: [204] }] },
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
    default: paramMessage`Operation '${"operationName"}' defines disallowed response status '${"statusCode"}'. Use only 200, 201, 202, or 204 success responses.`,
    get: "GET operations must include a 200 response and may only use 202 as an additional success response code.",
    emptyGet: "GET operations must declare at least one response and include a 200 response.",
    deleteSync: `Synchronous delete operations must have 200 and 204 responses. They must not have any other response codes. Consider using the 'ArmResourceDeleteSync' template.`,
    deleteAsync: `Long-running delete operations must have 202 and 204 responses. They must not have any other response codes. Consider using the 'ArmResourceDeleteWithoutOkAsync' template.`,
    put: `Put operations must have 200 and 201 responses. They must not have any other response codes.`,
    postSync: `Synchronous post operations must have either a 200 or 204 response. They must not have any other response codes.`,
    postAsync: `Long-running post operations must have a 202 response without a body and may have a 200 response with a body. They must not have any other response codes.`,
  },
  create(context) {
    return {
      root: (program) => {
        const [services] = getAllHttpServices(program);
        for (const service of services) {
          for (const httpOperation of service.operations) {
            const operation = httpOperation.operation;
            const entry = responsePolicies[httpOperation.verb];
            if (entry) {
              const policy =
                entry.lro && getLroMetadata(program, operation) ? entry.lro : entry.policy;
              if (!matchesPolicy(httpOperation.responses, policy)) {
                context.reportDiagnostic({
                  target: operation,
                  messageId:
                    (httpOperation.responses.length === 0 && policy.emptyMessageId) ||
                    policy.messageId,
                });
              }
              continue;
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
          }
        }
      },
    };
  },
});

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
    const bodyRequired = policy.body?.[code];
    if (
      bodyRequired !== undefined &&
      response.responses.some((r) => (r.body !== undefined) !== bodyRequired)
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
