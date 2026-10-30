import {
  createRule,
  fileRef,
  paramMessage,
  type Model,
  type Operation,
  type Program,
} from "@typespec/compiler";
import { getActionDetails, getParentResource } from "@typespec/rest";
import { getResourceBaseType, resolveArmResources, ResourceBaseType } from "../resource.js";
import {
  createArmServiceIndex,
  getCollectionPath,
  isCollectionGet,
  normalizeRoute,
} from "./nested-resource-missing-list-utils.js";

export const nestedResourceMissingListRule = createRule({
  name: "NestedResourcesMustHaveListOperation",
  description:
    "Per [ARM guidelines](https://github.com/Azure/azure-resource-manager-rpc/blob/master/v1.0/resource-api-reference.md), all the nested must have a list operation which returns the collection of the resource.",
  docs: fileRef.fromPackageRoot("src/rules/NestedResourcesMustHaveListOperation.md"),
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/NestedResourcesMustHaveListOperation",
  messages: {
    default: paramMessage`The nested resource "${"name"}" does not have list operation, please add it.`,
  },
  create(context) {
    const reportedModels = new Set<Model>();
    const serviceByOperation = createArmServiceIndex(context.program);

    return {
      root(program) {
        const { resources = [] } = resolveArmResources(program);
        for (const resource of resources) {
          if (resource.parent === undefined || !isApplicableResource(program, resource.type)) {
            continue;
          }

          // Skip resources with no eligible instance operations, including inferred ancestors.
          // Their children are still checked independently.
          const instanceOperations = Object.values(resource.operations.lifecycle)
            .flatMap((operations) => operations ?? [])
            .filter(
              (op) =>
                serviceByOperation.has(op.operation) &&
                getActionDetails(program, op.operation) === undefined,
            );
          const firstOperation = instanceOperations[0];
          if (firstOperation === undefined) continue;

          const collectionPath = getCollectionPath(resource.resourceInstancePath);
          const matchingLists = resource.operations.lists.filter(
            (list) =>
              normalizeRoute(list.path) === collectionPath && isCollectionGet(list.httpOperation),
          );
          const hasCollectionGetInEveryInstanceService = instanceOperations.every(
            ({ operation }) => {
              const service = serviceByOperation.get(operation);
              return (
                service !== undefined &&
                matchingLists.some((list) => serviceByOperation.get(list.operation) === service)
              );
            },
          );
          if (hasCollectionGetInEveryInstanceService) continue;

          reportMissingList(resource.type, firstOperation.operation);
        }
      },
    };

    function reportMissingList(model: Model, operation: Operation) {
      if (reportedModels.has(model)) return;
      reportedModels.add(model);
      context.reportDiagnostic({
        target: operation.interface ?? model,
        format: { name: model.name },
      });
    }
  },
});

function isApplicableResource(program: Program, model: Model): boolean {
  if (!getParentResource(program, model)) return false;
  const baseType = getResourceBaseType(program, model);
  return (
    baseType === ResourceBaseType.ResourceGroup ||
    baseType === ResourceBaseType.Subscription ||
    baseType === ResourceBaseType.Location
  );
}
