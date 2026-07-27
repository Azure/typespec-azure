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

export const trackedResourcesMustHavePutRule = createRule({
  name: "tracked-resources-must-have-put",
  description:
    "Tracked ARM resources must declare a PUT/createOrUpdate operation.",
  severity: "warning",
  messages: {
    default: paramMessage`Tracked resource '${"name"}' must have a put/createOrUpdate operation.`,
  },
  create(context) {
    return {
      model: (model) => {
        const armResource = getArmResources(context.program).find(
          (resource) => resource.typespecType === model,
        );
        if (
          armResource?.kind === "Tracked" &&
          armResource.operations.lifecycle.createOrUpdate === undefined
        ) {
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
