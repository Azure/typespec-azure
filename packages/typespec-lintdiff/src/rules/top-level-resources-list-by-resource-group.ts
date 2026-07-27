import { createRule, paramMessage } from "@typespec/compiler";
import {
  getArmResources,
  getResourceBaseType,
  ResourceBaseType,
  type ArmResourceDetails,
} from "@azure-tools/typespec-azure-resource-manager";

export const topLevelResourcesListByResourceGroupRule = createRule({
  name: "top-level-resources-list-by-resource-group",
  description:
    "Top-level resource-group ARM resources must define a list by resource group operation.",
  severity: "warning",
  messages: {
    default:
      paramMessage`Top-level resource '${"name"}' should define a list by resource group operation.`,
  },
  create(context) {
    return {
      root: (program) => {
        for (const armResource of getArmResources(program)) {
          if (!requiresListByResourceGroup(program, armResource)) {
            continue;
          }

          if (hasListByResourceGroupOperation(armResource)) {
            continue;
          }

          context.reportDiagnostic({
            target: armResource.typespecType,
            format: {
              name: armResource.name,
            },
          });
        }
      },
    };
  },
});

function requiresListByResourceGroup(program: Parameters<typeof getArmResources>[0], armResource: ArmResourceDetails): boolean {
  return (
    getResourceBaseType(program, armResource.typespecType) === ResourceBaseType.ResourceGroup &&
    isTopLevelResource(armResource)
  );
}

function isTopLevelResource(armResource: ArmResourceDetails): boolean {
  if (!armResource.resourceTypePath) {
    return false;
  }

  const providerMarker = "/providers/";
  const providerIndex = armResource.resourceTypePath.indexOf(providerMarker);
  if (providerIndex === -1) {
    return false;
  }

  const providerAndTypes = armResource.resourceTypePath
    .slice(providerIndex + providerMarker.length)
    .split("/")
    .filter((segment) => segment.length > 0 && !segment.startsWith("{"));

  return providerAndTypes.length === 2;
}

function hasListByResourceGroupOperation(armResource: ArmResourceDetails): boolean {
  return Object.values(armResource.operations.lists).some((operation) =>
    operation.path.includes("/resourceGroups/{resourceGroupName}/"),
  );
}
