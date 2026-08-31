import { createRule, fileRef, paramMessage } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { isArmProviderNamespace } from "../namespace.js";

export const noQueryParametersInPostRule = createRule({
  name: "no-query-parameters-in-post",
  docs: fileRef.fromPackageRoot("src/rules/no-query-parameters-in-post.md"),
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/no-query-parameters-in-post",
  description: "ARM POST operations must not declare query parameters other than api-version.",
  messages: {
    default: paramMessage`Query parameter '${"name"}' should be moved into the POST request body. POST operations must not contain query parameters other than api-version.`,
  },
  create(context) {
    return {
      operation: (operation) => {
        const namespace = operation.interface?.namespace ?? operation.namespace;
        if (!isArmProviderNamespace(context.program, namespace)) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        if (httpOperation.verb !== "post") {
          return;
        }

        for (const parameter of httpOperation.parameters.properties) {
          if (parameter.kind !== "query" || isApiVersionParameter(parameter.options.name)) {
            continue;
          }

          context.reportDiagnostic({
            target: parameter.property,
            format: {
              name: parameter.options.name,
            },
          });
        }
      },
    };
  },
});

function isApiVersionParameter(name: string): boolean {
  return name === "api-version";
}
