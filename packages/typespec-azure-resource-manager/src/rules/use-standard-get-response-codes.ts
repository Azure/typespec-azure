import { createRule, fileRef, getService } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { isStatusCodeAllowed, matchesStatusCode } from "./http-response-utils.js";

const allowedResponseCodes = new Set<number | "*">([200, 202, "*"]);

export const useStandardGetResponseCodesRule = createRule({
  name: "use-standard-get-response-codes",
  description:
    "ARM GET operations must include a 200 response and may only use 202 and default as additional response codes.",
  docs: fileRef.fromPackageRoot("src/rules/use-standard-get-response-codes.md"),
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/use-standard-get-response-codes",
  severity: "warning",
  messages: {
    default:
      "GET operations must include a 200 response and may only use 202 and default as additional response codes.",
    empty: "GET operations must declare at least one response and include a 200 response.",
  },
  create(context) {
    return {
      operation: (operation) => {
        let namespace = operation.namespace;
        while (namespace && !getService(context.program, namespace)) {
          namespace = namespace.namespace;
        }
        if (!namespace) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        if (httpOperation.verb !== "get") {
          return;
        }

        if (httpOperation.responses.length === 0) {
          context.reportDiagnostic({
            target: operation,
            messageId: "empty",
          });
          return;
        }

        const has200 = httpOperation.responses.some(({ statusCodes }) =>
          matchesStatusCode(statusCodes, 200),
        );
        const hasOnlyAllowedCodes = httpOperation.responses.every((response) =>
          isStatusCodeAllowed(response.statusCodes, allowedResponseCodes),
        );

        if (!has200 || !hasOnlyAllowedCodes) {
          context.reportDiagnostic({
            target: operation,
          });
        }
      },
    };
  },
});
