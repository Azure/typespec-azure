import { createRule, fileRef, paramMessage } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";

const pointOperationVerbs = new Set(["get", "put", "patch", "delete"]);
const providerAndNamespace = "/providers/[^/]+";
const resourceTypeAndResourceName = "(?:/\\w+/default|/\\w+/{[^/]+})";
const queryParameter = "(?:\\?\\w+)";
const pointOperationPathRegExp = new RegExp(
  `${providerAndNamespace}${resourceTypeAndResourceName}+${queryParameter}?$`,
  "i",
);

export const noQueryParamPointOpRule = createRule({
  name: "no-query-param-point-op",
  docs: fileRef.fromPackageRoot("src/rules/no-query-param-point-op.md"),
  description: "Point operations must not declare query parameters beyond api-version.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/no-query-param-point-op",
  messages: {
    default: paramMessage`Query parameter '${"name"}' should be removed. Point operation '${"verb"}' MUST not have query parameters other than api-version.`,
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
          if (parameter.type !== "query" || parameter.name.toLowerCase() === "api-version") {
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

/**
 * Returns whether the path targets a specific ARM resource instance after the provider namespace.
 * Each resource type segment must be followed by a resource name parameter or the `default` name.
 */
function isPointOperationPath(path: string): boolean {
  const index = path.lastIndexOf("/providers/");
  return index !== -1 && pointOperationPathRegExp.test(path.slice(index));
}
