import { getArmProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import {
  createRule,
  getLocationContext,
  type Namespace,
  paramMessage,
  type Program,
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
        if (namespace === undefined) {
          return;
        }

        const providerNamespace = getArmProviderNamespace(context.program, namespace);
        if (providerNamespace === undefined) {
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

          const key = createReportedParameterKey(
            context.program,
            namespace,
            httpOperation.path,
            parameter.name,
          );
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

export function createReportedParameterKey(
  program: Program,
  namespace: Namespace,
  path: string,
  parameterName: string,
): string {
  const providerNamespace = getArmProviderNamespace(program, namespace);
  if (providerNamespace === undefined) {
    throw new Error(
      "Cannot create a collection query parameter key outside an ARM provider namespace.",
    );
  }
  return `${providerNamespace}\0${path}\0${parameterName}`;
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
