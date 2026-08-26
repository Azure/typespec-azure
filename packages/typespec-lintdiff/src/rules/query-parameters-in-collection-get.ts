import { getArmProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import {
  createRule,
  getLocationContext,
  getNamespaceFullName,
  paramMessage,
} from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";

export const queryParametersInCollectionGetRule = createRule({
  name: "query-parameters-in-collection-get",
  description:
    "ARM collection GET/list operations must not declare query parameters beyond api-version and $filter.",
  severity: "warning",
  messages: {
    default: paramMessage`Query parameter '${"name"}' should be removed. Collection GET/list operations must not have query parameters other than api-version and $filter.`,
  },
  create(context) {
    const reportedParameters = new Set<string>();

    return {
      operation: (operation) => {
        const namespace = operation.interface?.namespace ?? operation.namespace;
        if (
          namespace === undefined ||
          getArmProviderNamespace(context.program, namespace) === undefined
        ) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        if (httpOperation.verb !== "get" || !isCollectionPath(httpOperation.path)) {
          return;
        }

        for (const parameter of httpOperation.parameters.parameters) {
          if (parameter.type !== "query" || isAllowedQueryParameter(parameter.name)) {
            continue;
          }

          const key = `${getNamespaceFullName(namespace)}\0${httpOperation.path}\0${parameter.name}`;
          if (reportedParameters.has(key)) {
            continue;
          }
          reportedParameters.add(key);

          context.reportDiagnostic({
            target:
              getLocationContext(context.program, parameter.param).type === "project"
                ? parameter.param
                : operation,
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
  return name === "api-version" || name === "$filter";
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
