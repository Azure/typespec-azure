import {
  createRule,
  getDiscriminator,
  paramMessage,
  type Interface,
  type Model,
} from "@typespec/compiler";
import {
  getArmResources,
  type ArmResourceDetails,
  type ArmResourceOperation,
} from "@azure-tools/typespec-azure-resource-manager";

export const allResourcesMustHaveGetOperationRule = createRule({
  name: "all-resources-must-have-get-operation",
  description:
    "ARM resources with PUT or PATCH operations must define a GET/read operation.",
  severity: "warning",
  messages: {
    default: paramMessage`Resource '${"name"}' must have a get/read operation.`,
  },
  create(context) {
    return {
      root: (program) => {
        for (const armResource of getArmResources(program)) {
          if (
            !requiresGetOperation(armResource) ||
            armResource.operations.lifecycle.read !== undefined ||
            hasDiscriminatorAncestor(context.program, armResource.typespecType)
          ) {
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

function requiresGetOperation(resource: ArmResourceDetails): boolean {
  return (
    resource.operations.lifecycle.createOrUpdate !== undefined ||
    resource.operations.lifecycle.update !== undefined
  );
}

function hasDiscriminatorAncestor(program: Parameters<typeof getArmResources>[0], model: Model): boolean {
  for (let current = model.baseModel; current !== undefined; current = current.baseModel) {
    if (getDiscriminator(program, current) !== undefined) {
      return true;
    }
  }

  return false;
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
