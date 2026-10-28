import { createRule, fileRef, isTemplateDeclarationOrInstance } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { getArmProviderNamespace } from "../namespace.js";
import { isTemplatedInterfaceOperation } from "./utils.js";

export const resourceGroupPathParameterRule = createRule({
  name: "resource-group-path-parameter",
  description: "ARM resource-group paths must use the resourceGroupName path parameter.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/resource-group-path-parameter",
  docs: fileRef.fromPackageRoot("src/rules/resource-group-path-parameter.md"),
  messages: {
    default: "Resource-group paths must include '/resourceGroups/{resourceGroupName}'.",
  },
  create(context) {
    return {
      operation: (operation) => {
        if (
          isTemplateDeclarationOrInstance(operation) ||
          isTemplatedInterfaceOperation(operation)
        ) {
          return;
        }

        const namespace = operation.interface?.namespace ?? operation.namespace;
        if (
          namespace === undefined ||
          getArmProviderNamespace(context.program, namespace) === undefined
        ) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        if (
          httpOperation.verb !== "get" &&
          httpOperation.verb !== "put" &&
          httpOperation.verb !== "patch" &&
          httpOperation.verb !== "delete"
        ) {
          return;
        }

        const path = httpOperation.path.toLowerCase();
        if (
          path.includes("/resourcegroups/") &&
          !path.includes("/resourcegroups/{resourcegroupname}")
        ) {
          context.reportDiagnostic({ target: operation });
        }
      },
    };
  },
});
