import {
  createRule,
  paramMessage,
  type Interface,
  type Model,
} from "@typespec/compiler";
import {
  getArmResources,
  type ArmResourceDetails,
  type ArmResourceOperation,
} from "@azure-tools/typespec-azure-resource-manager";

export const nestedResourcesMustHaveListOperationRule = createRule({
  name: "nested-resources-must-have-list-operation",
  description: "Nested ARM resources must define a list operation.",
  severity: "warning",
  messages: {
    default:
      paramMessage`Nested resource '${"name"}' should define a list operation.`,
  },
  create(context) {
    return {
      root: (program) => {
        for (const armResource of getArmResources(program)) {
          if (!isNestedResource(armResource) || hasListOperation(armResource)) {
            continue;
          }

          context.reportDiagnostic({
            target: getDiagnosticTarget(armResource),
            format: {
              name: armResource.name,
            },
          });
        }
      },
    };
  },
});

function isNestedResource(armResource: ArmResourceDetails): boolean {
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

  return providerAndTypes.length > 2;
}

function hasListOperation(armResource: ArmResourceDetails): boolean {
  return Object.values(armResource.operations.lists).length > 0;
}

function getDiagnosticTarget(resource: ArmResourceDetails): Interface | Model {
  return (
    getOperationInterface(Object.values(resource.operations.lifecycle)) ??
    getOperationInterface(Object.values(resource.operations.lists)) ??
    getOperationInterface(Object.values(resource.operations.actions)) ??
    resource.typespecType
  );
}

function getOperationInterface(
  operations: Array<ArmResourceOperation | undefined>,
): Interface | undefined {
  return operations.find((operation) => operation?.operation.interface !== undefined)
    ?.operation.interface;
}
