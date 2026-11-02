import { createRule, fileRef, paramMessage, type Model, type Program } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { getActionDetails, getParentResource } from "@typespec/rest";
import { getArmResourceOperationList } from "../operations.js";
import {
  getArmResources,
  getResourceBaseType,
  isSingletonResource,
  parseArmResourceInstancePath,
  ResourceBaseType,
} from "../resource.js";
import {
  createArmServiceIndex,
  createSubscriptionListIndex,
  getCollectionPath,
  isCollectionGet,
  normalizeRoute,
} from "./nested-resources-must-have-list-operation-utils.js";

export const nestedResourcesMustHaveListOperationRule = createRule({
  name: "nested-resources-must-have-list-operation",
  description:
    "Per [ARM guidelines](https://github.com/Azure/azure-resource-manager-rpc/blob/master/v1.0/resource-api-reference.md), all the nested must have a list operation which returns the collection of the resource.",
  docs: fileRef.fromPackageRoot("src/rules/nested-resources-must-have-list-operation.md"),
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/nested-resources-must-have-list-operation",
  messages: {
    default: paramMessage`The nested resource "${"name"}" does not have list operation, please add it.`,
  },
  create(context) {
    const serviceByOperation = createArmServiceIndex(context.program);
    const subscriptionLists = createSubscriptionListIndex(context.program, serviceByOperation);

    return {
      root(program) {
        for (const resource of getArmResources(program)) {
          const model = resource.typespecType;
          if (isSingletonResource(program, model) || !isApplicableResource(program, model)) {
            continue;
          }

          // The lifecycle dictionary retains only the last operation of each kind.
          const operations = [...getArmResourceOperationList(program, model)].map(
            ({ kind, operation }) => {
              const [httpOperation] = getHttpOperation(program, operation);
              return { kind, operation, httpOperation };
            },
          );
          const collectionName = resource.collectionName?.toLowerCase();
          const instanceOperations = operations.filter(({ kind, operation, httpOperation }) => {
            if (
              kind === "list" ||
              kind === "action" ||
              kind === "other" ||
              !serviceByOperation.has(operation) ||
              getActionDetails(program, operation) !== undefined
            ) {
              return false;
            }
            const path = parseArmResourceInstancePath(httpOperation.path);
            if (path === undefined || path.resourceType.types.length < 2) return false;

            // A lifecycle template can borrow an ancestor model for a non-resource endpoint.
            const resourceTypes = path.resourceType.types.map((type) => type.toLowerCase());
            return (
              collectionName === undefined ||
              resourceTypes.at(-1) === collectionName ||
              !resourceTypes.includes(collectionName)
            );
          });
          const firstOperation = instanceOperations[0];
          if (firstOperation === undefined) continue;

          const lists = operations.filter(
            ({ kind, httpOperation }) => kind === "list" && isCollectionGet(httpOperation),
          );
          const hasListInEveryInstanceService = instanceOperations.every(
            ({ operation, httpOperation }) => {
              const service = serviceByOperation.get(operation);
              const collectionPath = getCollectionPath(httpOperation.path);
              return (
                service !== undefined &&
                (lists.some(
                  (list) =>
                    normalizeRoute(list.httpOperation.path) === collectionPath &&
                    serviceByOperation.get(list.operation) === service,
                ) ||
                  subscriptionLists.get(model)?.has(service) === true)
              );
            },
          );
          if (hasListInEveryInstanceService) continue;

          context.reportDiagnostic({
            target: firstOperation.operation.interface ?? model,
            format: { name: model.name },
          });
        }
      },
    };
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
