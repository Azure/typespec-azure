import { createRule, fileRef, paramMessage } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { isApiVersionParameterName } from "./utils.js";

export const noQueryInCollectionRule = createRule({
  name: "no-query-in-collection",
  docs: fileRef.fromPackageRoot("src/rules/no-query-in-collection.md"),
  description:
    "ARM collection GET operations must not declare query parameters beyond api-version and $filter.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/no-query-in-collection",
  messages: {
    default: paramMessage`Query parameter '${"name"}' should be removed. Collection GET operations must not have query parameters other than api-version and $filter.`,
  },
  create(context) {
    const reportedParameters = new Set<object>();

    return {
      operation: (operation) => {
        const [httpOperation] = getHttpOperation(context.program, operation);
        if (httpOperation.verb !== "get" || !isCollectionPath(httpOperation.path)) {
          return;
        }

        for (const parameter of httpOperation.parameters.properties) {
          const parameterSource = parameter.property.node ?? parameter.property;
          if (
            parameter.kind !== "query" ||
            isAllowedQueryParameter(parameter.options.name) ||
            reportedParameters.has(parameterSource)
          ) {
            continue;
          }
          reportedParameters.add(parameterSource);

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

function isAllowedQueryParameter(name: string): boolean {
  return isApiVersionParameterName(name) || name === "$filter";
}

function isCollectionPath(path: string): boolean {
  if (!path.includes(".")) {
    return false;
  }

  const providerPath = path.split(".").at(-1);
  return (
    providerPath !== undefined &&
    providerPath.includes("/") &&
    providerPath.split("/").length % 2 === 0
  );
}
