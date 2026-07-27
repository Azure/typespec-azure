import { createRule, paramMessage } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { getArmResourceOperationData } from "@azure-tools/typespec-azure-resource-manager";

export const parametersInPostRule = createRule({
  name: "parameters-in-post",
  description: "POST ARM resource actions must not declare extra query parameters.",
  severity: "warning",
  messages: {
    default: paramMessage`Query parameter '${"name"}' should be moved into the POST payload. POST operations must not contain query parameters other than api-version.`,
  },
  create(context) {
    return {
      operation: (operation) => {
        const armOperation = getArmResourceOperationData(context.program, operation);
        if (armOperation?.kind !== "action") {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        if (httpOperation.verb !== "post") {
          return;
        }

        for (const parameter of httpOperation.parameters.parameters) {
          if (parameter.type !== "query" || isApiVersionParameter(parameter.name)) {
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

function isApiVersionParameter(name: string): boolean {
  return name.toLowerCase() === "api-version";
}
