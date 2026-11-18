import { createRule, fileRef, isTemplateDeclarationOrInstance } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { getArmProviderNamespace } from "../namespace.js";
import { isTemplatedInterfaceOperation } from "./utils.js";

export const useScopePathStandardNameRule = createRule({
  name: "use-scope-path-standard-name",
  description: "ARM scope paths must use the resourceGroupName and subscriptionId path parameters.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/use-scope-path-standard-name",
  docs: fileRef.fromPackageRoot("src/rules/use-scope-path-standard-name.md"),
  messages: {
    resourceGroup: "Resource-group paths must include '/resourceGroups/{resourceGroupName}'.",
    subscription: "Subscription paths must include '/subscriptions/{subscriptionId}'.",
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
          context.reportDiagnostic({ target: operation, messageId: "resourceGroup" });
        }
        if (path.includes("/subscriptions/") && !path.includes("/subscriptions/{subscriptionid}")) {
          context.reportDiagnostic({ target: operation, messageId: "subscription" });
        }
      },
    };
  },
});
