import {
  createRule,
  fileRef,
  getDiscriminator,
  paramMessage,
  type Interface,
  type Model,
  type Program,
} from "@typespec/compiler";
import type { ArmResourceOperation } from "../operations.js";
import { getArmResources, type ArmResourceDetails } from "../resource.js";
import { getInterface } from "./utils.js";

export const resourceMissingReadRule = createRule({
  name: "resource-missing-read",
  description: "ARM resources with create or update operations must define a read operation.",
  docs: fileRef.fromPackageRoot("src/rules/resource-missing-read.md"),
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/resource-missing-read",
  severity: "warning",
  messages: {
    default: paramMessage`Resource '${"name"}' must have a get/read operation.`,
  },
  create(context) {
    return {
      root: (program) => {
        for (const resource of getArmResources(program)) {
          if (
            !requiresRead(resource) ||
            resource.operations.lifecycle.read !== undefined ||
            hasDiscriminatorAncestor(program, resource.typespecType)
          ) {
            continue;
          }

          context.reportDiagnostic({
            target: getDiagnosticTarget(resource),
            format: { name: resource.name },
          });
        }
      },
    };
  },
});

function requiresRead(resource: ArmResourceDetails): boolean {
  return (
    resource.operations.lifecycle.createOrUpdate !== undefined ||
    resource.operations.lifecycle.update !== undefined
  );
}

function hasDiscriminatorAncestor(program: Program, model: Model): boolean {
  for (let current = model.baseModel; current !== undefined; current = current.baseModel) {
    if (getDiscriminator(program, current) !== undefined) {
      return true;
    }
  }
  return false;
}

function getDiagnosticTarget(resource: ArmResourceDetails): Interface | Model {
  return (
    resource.operations.lifecycle.createOrUpdate?.operation.interface ??
    resource.operations.lifecycle.update?.operation.interface ??
    getInterface(resource) ??
    getOperationInterface(Object.values(resource.operations.lists)) ??
    getOperationInterface(Object.values(resource.operations.actions)) ??
    resource.typespecType
  );
}

function getOperationInterface(
  operations: Array<ArmResourceOperation | undefined>,
): Interface | undefined {
  return operations.find((operation) => operation?.operation.interface !== undefined)?.operation
    .interface;
}
