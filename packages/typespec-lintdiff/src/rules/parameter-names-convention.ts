import { createRule, paramMessage } from "@typespec/compiler";
import { isArmProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import { getHttpOperation, type HttpOperationParameter } from "@typespec/http";

const invalidLeadingCharacterPattern = /^[$@]/;
const camelCasePattern = /^[a-z][a-z0-9]*([A-Z][a-z0-9]+)*$/;
const kebabCasePattern = /^[A-Za-z][a-z0-9]*(-[A-Za-z][a-z0-9]*)*$/;

export const parameterNamesConventionRule = createRule({
  name: "parameter-names-convention",
  description:
    "Data-plane path and query parameters must use camelCase, and header parameters must use kebab-case.",
  severity: "warning",
  messages: {
    invalidLeadingCharacter:
      paramMessage`Parameter name '${"name"}' should not begin with '$' or '@'.`,
    camelCase: paramMessage`Parameter name '${"name"}' should be camel case.`,
    kebabCase: paramMessage`header parameter name '${"name"}' should be kebab case.`,
  },
  create(context) {
    return {
      operation: (operation) => {
        const namespace = operation.interface?.namespace ?? operation.namespace;
        if (isArmProviderNamespace(context.program, namespace)) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        for (const parameter of httpOperation.parameters.parameters) {
          const messageId = getMessageId(parameter);
          if (messageId === undefined) {
            continue;
          }

          context.reportDiagnostic({
            target: parameter.param,
            messageId,
            format: {
              name: parameter.name,
            },
          });
        }
      },
    };
  },
});

function getMessageId(
  parameter: HttpOperationParameter,
):
  | "invalidLeadingCharacter"
  | "camelCase"
  | "kebabCase"
  | undefined {
  if (invalidLeadingCharacterPattern.test(parameter.name)) {
    return "invalidLeadingCharacter";
  }

  if (
    (parameter.type === "path" || parameter.type === "query") &&
    parameter.name !== "api-version" &&
    !camelCasePattern.test(parameter.name)
  ) {
    return "camelCase";
  }

  if (parameter.type === "header" && !kebabCasePattern.test(parameter.name)) {
    return "kebabCase";
  }

  return undefined;
}
