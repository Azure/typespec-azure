import { createRule, paramMessage } from "@typespec/compiler";
import { getArmResourceOperationData } from "@azure-tools/typespec-azure-resource-manager";
import { getHttpOperation } from "@typespec/http";

const pointOperationKinds = new Set(["read", "createOrUpdate", "update", "delete"]);
const pointOperationVerbs = new Set(["get", "put", "patch", "delete"]);
const providerAndNamespace = "/providers/[^/]+";
const resourceTypeAndResourceName = "(?:/\\w+/default|/\\w+/{[^/]+})";
const pointOperationPathRegExp = new RegExp(
  `${providerAndNamespace}${resourceTypeAndResourceName}+$`,
  "i",
);

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
        const armOperation = getArmResourceOperationData(context.program, operation);
        const [httpOperation] = getHttpOperation(context.program, operation);
        if (!pointOperationVerbs.has(httpOperation.verb)) {
          return;
        }

        // Determine whether this is a point operation. Standard ARM resource
        // operations expose a kind (read/createOrUpdate/update/delete). Some
        // point-resource GETs are authored as ARM actions (e.g. legacy
        // RoutedOperations.ActionSync) which report kind "action"; the upstream
        // validator classifies purely by path shape, so fall back to the path
        // regex whenever the ARM kind is not itself a point kind.
        const isPointKind = armOperation
          ? pointOperationKinds.has(armOperation.kind)
          : false;
        if (!isPointKind && !isPointOperationPath(httpOperation.path)) {
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

function isPointOperationPath(path: string): boolean {
  const index = path.lastIndexOf("/providers/");
  if (index === -1) {
    return false;
  }

  return pointOperationPathRegExp.test(path.slice(index));
}
