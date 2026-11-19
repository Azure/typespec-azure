import { createRule, fileRef, paramMessage } from "@typespec/compiler";
import { resolveArmResources, type ResolvedResource } from "../resource.js";
import { isInternalTypeSpec } from "./utils.js";

export const noResourceDuplicatesRule = createRule({
  name: "no-resource-duplicates",
  description:
    "ARM resource instances must resolve to a single resource per resource type and instance path.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/no-resource-duplicates",
  docs: fileRef.fromPackageRoot("src/rules/no-resource-duplicates.md"),
  messages: {
    default: paramMessage`Resource '${"name"}' resolves to the same resource type '${"resourceType"}' and instance path '${"path"}' as resource '${"firstName"}'. Use consistent resource names and operation templates so this instance resolves to a single resource.`,
  },
  create(context) {
    return {
      root(program) {
        const firstResources = new Map<string, ResolvedResource>();
        for (const resource of resolveArmResources(program).resources ?? []) {
          const lifecycle = resource.operations.lifecycle;
          const target = [...(lifecycle.read ?? []), ...(lifecycle.createOrUpdate ?? [])].find(
            ({ operation }) => !isInternalTypeSpec(program, operation),
          )?.operation;
          // Synthetic ancestors have no identity operation of their own.
          if (target === undefined) continue;

          const resourceType = `${resource.resourceType.provider}/${resource.resourceType.types.join("/")}`;
          // Retain parameter names; the resolver's structural normalizer removes them.
          const key = JSON.stringify([
            resourceType.toLowerCase(),
            resource.resourceInstancePath.toLowerCase(),
          ]);
          const first = firstResources.get(key);
          if (first === undefined) {
            firstResources.set(key, resource);
            continue;
          }

          context.reportDiagnostic({
            target,
            format: {
              name: resource.resourceName,
              firstName: first.resourceName,
              resourceType,
              path: resource.resourceInstancePath,
            },
          });
        }
      },
    };
  },
});
