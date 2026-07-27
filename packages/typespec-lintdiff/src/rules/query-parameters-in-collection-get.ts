import { createRule, paramMessage } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { getArmResourceOperationData } from "@azure-tools/typespec-azure-resource-manager";

export const queryParametersInCollectionGetRule = createRule({
  name: "query-parameters-in-collection-get",
  description:
    "ARM collection GET/list operations must not declare query parameters beyond api-version and $filter.",
  severity: "warning",
  messages: {
    default: paramMessage`Query parameter '${"name"}' should be removed. Collection GET/list operations must not have query parameters other than api-version and $filter.`,
  },
  create(context) {
    return {
      operation: (operation) => {
        const armOperation = getArmResourceOperationData(context.program, operation);
        if (armOperation?.kind !== "list") {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        if (httpOperation.verb !== "get") {
          return;
        }

        for (const parameter of httpOperation.parameters.parameters) {
          if (parameter.type !== "query" || isAllowedQueryParameter(parameter.name)) {
            continue;
          }

          context.reportDiagnostic({
            target: parameter.param,
            format: {
              name: parameter.name,
            },
          });
        }
      },
    };
  },
});

function isAllowedQueryParameter(name: string): boolean {
  const normalized = name.toLowerCase();
  return normalized === "api-version" || normalized === "$filter";
}
