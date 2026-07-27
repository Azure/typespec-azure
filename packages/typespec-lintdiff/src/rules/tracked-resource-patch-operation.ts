import { createRule, paramMessage } from "@typespec/compiler";
import { getArmResources } from "@azure-tools/typespec-azure-resource-manager";

const privateEndpointConnectionProxySegment = "privateendpointconnectionproxies";

export const trackedResourcePatchOperationRule = createRule({
  name: "tracked-resource-patch-operation",
  description:
    "Tracked ARM resources must define a PATCH operation, except for privateEndpointConnectionProxies.",
  severity: "warning",
  messages: {
    default:
      paramMessage`Tracked resource '${"name"}' must have patch operation that at least supports the update of tags.`,
  },
  create(context) {
    return {
      model: (model) => {
        const armResource = getArmResources(context.program).find(
          (resource) => resource.typespecType === model,
        );

        if (armResource?.kind !== "Tracked") {
          return;
        }

        const resourcePath = getRepresentativePath(armResource);
        if (
          resourcePath === undefined ||
          resourcePath.toLowerCase().includes(privateEndpointConnectionProxySegment) ||
          armResource.operations.lifecycle.update !== undefined
        ) {
          return;
        }

        context.reportDiagnostic({
          target: model,
          format: {
            name: armResource.name,
          },
        });
      },
    };
  },
});

function getRepresentativePath(resource: ReturnType<typeof getArmResources>[number]): string | undefined {
  return (
    resource.operations.lifecycle.read?.path ??
    resource.operations.lifecycle.createOrUpdate?.path ??
    resource.operations.lifecycle.delete?.path ??
    resource.operations.lifecycle.update?.path ??
    Object.values(resource.operations.lists)[0]?.path
  );
}
