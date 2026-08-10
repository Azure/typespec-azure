import { createRule, paramMessage } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { isPointOperationPath } from "./point-operation-path.js";

const pointOperationVerbs = new Set(["get", "put", "patch", "delete"]);

export const validQueryParametersForPointOperationsRule = createRule({
  name: "valid-query-parameters-for-point-operations",
  description:
    "Point operations must not declare query parameters beyond api-version.",
  severity: "warning",
  messages: {
    default:
      paramMessage`Query parameter '${"name"}' should be removed. Point operation '${"verb"}' MUST not have query parameters other than api-version.`,
  },
  create(context) {
    return {
      operation: (operation) => {
        const [httpOperation] = getHttpOperation(context.program, operation);
        if (
          !pointOperationVerbs.has(httpOperation.verb) ||
          !isPointOperationPath(httpOperation.path)
        ) {
          return;
        }

        for (const parameter of httpOperation.parameters.parameters) {
          if (
            parameter.type !== "query" ||
            parameter.name.toLowerCase() === "api-version"
          ) {
            continue;
          }

          context.reportDiagnostic({
            target: parameter.param,
            format: {
              name: parameter.name,
              verb: httpOperation.verb,
            },
          });
        }
      },
    };
  },
});
