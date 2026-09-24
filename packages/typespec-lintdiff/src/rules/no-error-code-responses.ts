import { getArmProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import { createRule, paramMessage } from "@typespec/compiler";
import { getAllHttpServices, type HttpStatusCodeRange } from "@typespec/http";

const allowedStatusCodes = new Set<number | "*">([200, 201, 202, 204, "*"]);

export const noErrorCodeResponsesRule = createRule({
  name: "no-error-code-responses",
  description: "Operations must not define response codes outside 200, 201, 202, 204, or default.",
  severity: "warning",
  messages: {
    default: paramMessage`Operation '${"operationName"}' defines disallowed response status '${"statusCode"}'. Use only 200, 201, 202, 204, or default responses.`,
  },
  create(context) {
    return {
      root: () => {
        const [services] = getAllHttpServices(context.program);
        for (const service of services) {
          for (const { operation, responses } of service.operations) {
            const namespace = operation.interface?.namespace ?? operation.namespace;
            // The mixed lintdiff ruleset also runs on data-plane services.
            if (!namespace || !getArmProviderNamespace(context.program, namespace)) {
              continue;
            }
            for (const response of responses) {
              if (isExplicitErrorCode(response.statusCodes)) {
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

function isExplicitErrorCode(statusCode: number | "*" | HttpStatusCodeRange): boolean {
  if (statusCode === "*") {
    return false;
  }

  if (typeof statusCode === "number") {
    return !allowedStatusCodes.has(statusCode);
  }

  return statusCode.start !== statusCode.end || !allowedStatusCodes.has(statusCode.start);
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
