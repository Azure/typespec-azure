import { createRule, fileRef, paramMessage, type Model } from "@typespec/compiler";
import { resolveArmResources } from "../resource.js";

export const topLevelResourcesListBySubscriptionRule = createRule({
  name: "top-level-resources-list-by-subscription",
  description: "Top-level subscription resources must provide a list by subscription operation.",
  docs: fileRef.fromPackageRoot("src/rules/top-level-resources-list-by-subscription.md"),
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/top-level-resources-list-by-subscription",
  messages: {
    default: paramMessage`The top-level resource "${"name"}" does not have list by subscription operation, please add it.`,
  },
  create(context) {
    return {
      root(program) {
        const { resources = [] } = resolveArmResources(program);
        const reported = new Set<Model>();
        for (const resource of resources) {
          if (resource.resourceType.types.length !== 1 || reported.has(resource.type)) continue;

          const instance = Object.values(resource.operations.lifecycle)
            .flatMap((operations) => operations ?? [])
            .find(({ path }) =>
              /^\/subscriptions\/\{[^/]+\}\/providers\/[^/]+\/[^/]+\/[^/]+\/?$/i.test(path),
            );
          if (instance === undefined) continue;

          const collectionPath = normalizeRoute(instance.path.replace(/\/[^/]+\/?$/, ""));
          const hasList = resources.some(
            (candidate) =>
              candidate.type === resource.type &&
              candidate.operations.lists.some(
                ({ path, httpOperation }) =>
                  normalizeRoute(path) === collectionPath &&
                  httpOperation.verb === "get" &&
                  httpOperation.responses.some(
                    ({ statusCodes }) =>
                      typeof statusCodes === "number" && statusCodes >= 200 && statusCodes < 300,
                  ),
              ),
          );
          if (hasList) continue;

          reported.add(resource.type);
          context.reportDiagnostic({
            target: instance.operation.interface ?? resource.type,
            format: { name: resource.type.name },
          });
        }
      },
    };
  },
});

function normalizeRoute(path: string): string {
  return path
    .replace(/\{[^}]+\}/g, "{}")
    .replace(/\/+$/, "")
    .toLowerCase();
}
