import { createRule, fileRef, isList, paramMessage, typeTarget } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { isApiVersionParameterName, isCollectionPath } from "./utils.js";

export const noQueryInCollectionRule = createRule({
  name: "no-query-in-collection",
  docs: fileRef.fromPackageRoot("src/rules/no-query-in-collection.md"),
  description:
    "ARM collection GET and list operations must not declare query parameters beyond api-version and $filter.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/no-query-in-collection",
  messages: {
    default: paramMessage`Query parameter '${"name"}' should be removed. Collection GET and list operations must not have query parameters other than api-version and $filter.`,
  },
  create(context) {
    // Parameter names already reported at each location.
    const reported = new Map<object, Set<string>>();

    return {
      operation: (operation) => {
        const [httpOperation] = getHttpOperation(context.program, operation);
        if (
          !isList(context.program, operation) &&
          (httpOperation.verb !== "get" || !isCollectionPath(httpOperation.path))
        ) {
          return;
        }

        for (const parameter of httpOperation.parameters.properties) {
          if (parameter.kind !== "query" || isAllowedQueryParameter(parameter.options.name)) {
            continue;
          }
          // Locate the parameter from this operation: a library parameter is reported on the spread,
          // `is` reference or template argument that brings it in, a project one on its declaration.
          const fromOperation = typeTarget(context.program, operation, "parameters").property(
            parameter.property.name,
          );
          const target =
            fromOperation?.type === parameter.property ? fromOperation : parameter.property;
          const location = target.node ?? parameter.property;
          const names = reported.get(location) ?? new Set<string>();
          if (names.has(parameter.property.name)) {
            continue;
          }
          reported.set(location, names.add(parameter.property.name));

          context.reportDiagnostic({
            target,
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
