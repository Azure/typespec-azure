import { createRule, fileRef, paramMessage, type Model } from "@typespec/compiler";
import { resolveArmResources } from "../resource.js";

export const topLevelResourcesListByResourceGroupRule = createRule({
  name: "top-level-resources-list-by-resource-group",
  description:
    "Top-level resource-group ARM resources must define a list by resource group operation.",
  docs: fileRef.fromPackageRoot("src/rules/top-level-resources-list-by-resource-group.md"),
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/top-level-resources-list-by-resource-group",
  severity: "warning",
  messages: {
    default: paramMessage`Top-level resource '${"name"}' should define a list by resource group operation.`,
  },
  create(context) {
    return {
      root(program) {
        const reported = new Set<Model>();
        for (const resource of resolveArmResources(program).resources ?? []) {
          if (
            resource.scope !== "ResourceGroup" ||
            resource.parent !== undefined ||
            resource.resourceType.types.length !== 1 ||
            !Object.values(resource.operations.lifecycle).some((operations) => operations?.length)
          ) {
            continue;
          }

          const instancePath = normalizePath(resource.resourceInstancePath);
          const collectionPath = instancePath.slice(0, instancePath.lastIndexOf("/"));
          if (
            resource.operations.lists.some(
              (operation) =>
                operation.httpOperation.verb === "get" &&
                normalizePath(operation.path) === collectionPath,
            ) ||
            reported.has(resource.type)
          ) {
            continue;
          }

          reported.add(resource.type);
          context.reportDiagnostic({
            target: resource.type,
            format: { name: resource.type.name },
          });
        }
      },
    };
  },
});

function normalizePath(path: string): string {
  return path
    .replace(/\/$/, "")
    .replace(/\{[^}]+\}/g, "{}")
    .toLowerCase();
}
