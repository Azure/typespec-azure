import { createRule, fileRef, listServices, paramMessage } from "@typespec/compiler";
import { isArmProviderNamespace } from "../namespace.js";
import { resolveArmResources, type ResolvedResource } from "../resource.js";
import { isInternalTypeSpec } from "./utils.js";

export const noResourceNameConflictRule = createRule({
  name: "no-resource-name-conflict",
  description: "ARM resources must have unique logical resource names.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/no-resource-name-conflict",
  docs: fileRef.fromPackageRoot("src/rules/no-resource-name-conflict.md"),
  messages: {
    default: paramMessage`Resources must have unique names. Resource name '${"name"}' is used by both '${"firstPath"}' and '${"secondPath"}'. Provide a unique resource name when instantiating the resource operations.`,
  },
  create(context) {
    return {
      root(program) {
        const services = new Set(
          listServices(program)
            .filter(({ type }) => isArmProviderNamespace(program, type))
            .map(({ type }) => type),
        );
        const names = new Map<string, ResolvedResource>();
        for (const resource of resolveArmResources(program).resources ?? []) {
          const operation =
            resource.operations.lifecycle.read?.[0]?.operation ??
            resource.operations.lifecycle.createOrUpdate?.[0]?.operation;
          // Synthetic parents have no identity operation and no author-controlled template name.
          if (operation === undefined || isInternalTypeSpec(program, operation)) continue;

          let namespace = operation.namespace;
          while (namespace !== undefined && !services.has(namespace)) {
            namespace = namespace.namespace;
          }
          if (namespace === undefined) continue;

          const first = names.get(resource.resourceName);
          if (first === undefined) {
            names.set(resource.resourceName, resource);
          } else {
            context.reportDiagnostic({
              target: operation,
              format: {
                name: resource.resourceName,
                firstPath: first.resourceInstancePath,
                secondPath: resource.resourceInstancePath,
              },
            });
          }
        }
      },
    };
  },
});
