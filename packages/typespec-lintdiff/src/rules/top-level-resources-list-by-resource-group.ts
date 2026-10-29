import {
  getArmResourceOperationList,
  getArmResources,
  getResourceOperation,
} from "@azure-tools/typespec-azure-resource-manager";
import { createRule, paramMessage } from "@typespec/compiler";
import { getParentResource } from "@typespec/rest";

export const topLevelResourcesListByResourceGroupRule = createRule({
  name: "top-level-resources-list-by-resource-group",
  description:
    "Top-level resource-group ARM resources must define a list by resource group operation.",
  severity: "warning",
  messages: {
    default: paramMessage`Top-level resource '${"name"}' should define a list by resource group operation.`,
  },
  create(context) {
    return {
      root: (program) => {
        for (const resource of getArmResources(program)) {
          if (getParentResource(program, resource.typespecType) !== undefined) {
            continue;
          }

          const operations = [...getArmResourceOperationList(program, resource.typespecType)].map(
            (operation) => ({
              kind: operation.kind,
              path: getResourceOperation(program, operation.operation)?.path ?? "",
            }),
          );
          const hasResourceGroupInstance = operations.some(
            (operation) =>
              operation.kind !== "list" &&
              operation.kind !== "action" &&
              operation.kind !== "other" &&
              /^\/subscriptions\/\{[^}]+\}\/resourcegroups\/\{[^}]+\}\/providers\/[^/]+\/[^/]+\/[^/]+\/?$/i.test(
                operation.path,
              ),
          );
          const hasResourceGroupList = operations.some(
            (operation) =>
              operation.kind === "list" &&
              /^\/subscriptions\/\{[^}]+\}\/resourcegroups\/\{[^}]+\}\/providers\/[^/]+\/[^/]+\/?$/i.test(
                operation.path,
              ),
          );
          if (!hasResourceGroupInstance || hasResourceGroupList) {
            continue;
          }

          context.reportDiagnostic({
            target: resource.typespecType,
            format: {
              name: resource.name,
            },
          });
        }
      },
    };
  },
});
