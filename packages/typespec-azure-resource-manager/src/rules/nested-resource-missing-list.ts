import {
  createRule,
  fileRef,
  isArrayModelType,
  paramMessage,
  type Model,
  type Operation,
  type Program,
} from "@typespec/compiler";
import {
  createMetadataInfo,
  getAllHttpServices,
  Visibility,
  type HttpOperation,
  type MetadataInfo,
} from "@typespec/http";
import { getActionDetails, getParentResource, getResourceOperation } from "@typespec/rest";
import { getArmProviderNamespace } from "../namespace.js";
import { getArmOperationList } from "../operations.js";
import { getResourceBaseType, resolveArmResources, ResourceBaseType } from "../resource.js";
import { walkJsonProperties } from "./model-utils.js";

interface ArmServiceOperations {
  operations: readonly HttpOperation[];
  collectionPaths: ReadonlySet<string>;
}

export const nestedResourceMissingListRule = createRule({
  name: "nested-resource-missing-list",
  description: "Nested ARM resources must provide a list operation at their parent collection.",
  docs: fileRef.fromPackageRoot("src/rules/nested-resource-missing-list.md"),
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/nested-resource-missing-list",
  messages: {
    default: paramMessage`Nested resource '${"name"}' must have a list operation at its parent collection.`,
  },
  create(context) {
    const metadata = createMetadataInfo(context.program, { canonicalVisibility: Visibility.Read });
    const checkedOperations = new Set<Operation>();
    const reportedModels = new Set<Model>();
    const [services] = getAllHttpServices(context.program);
    const armServices = services
      // REST metadata also exists in non-ARM services. Do not apply ARM list requirements there.
      .filter(
        (service) => getArmProviderNamespace(context.program, service.namespace) !== undefined,
      )
      .map(({ operations }) => ({
        operations,
        collectionPaths: new Set(
          operations
            .filter((op) => isCollectionGet(op, metadata, context.program))
            .map((op) => normalizeRoute(op.path)),
        ),
      }));
    const serviceByOperation = new Map<Operation, ArmServiceOperations>();
    for (const service of armServices) {
      for (const { operation } of service.operations) {
        serviceByOperation.set(operation, service);
      }
    }

    return {
      root(program) {
        const { resources = [] } = resolveArmResources(program);
        for (const resource of resources) {
          if (resource.parent === undefined || !isApplicableResource(program, resource.type)) {
            continue;
          }

          // Synthetic parents have no lifecycle operations; do not report them as authored resources.
          const instanceOperations = Object.values(resource.operations.lifecycle)
            .flatMap((operations) => operations ?? [])
            .filter(
              (op) =>
                serviceByOperation.has(op.operation) &&
                getActionDetails(program, op.operation) === undefined,
            );
          const firstOperation = instanceOperations[0];
          if (firstOperation === undefined) continue;
          for (const { operation } of instanceOperations) checkedOperations.add(operation);

          const collectionPath = getCollectionPath(resource.resourceInstancePath);
          const matchingLists = resource.operations.lists.filter(
            (list) =>
              normalizeRoute(list.path) === collectionPath &&
              isCollectionGet(list.httpOperation, metadata, program),
          );
          const hasAllCollectionGets = instanceOperations.every(({ operation }) => {
            const service = serviceByOperation.get(operation);
            if (service === undefined) return false;
            if (matchingLists.some((list) => serviceByOperation.get(list.operation) === service)) {
              return true;
            }
            // A collection GET authored as an action is not included in the resolver's lists.
            return service.collectionPaths.has(collectionPath);
          });
          if (hasAllCollectionGets) continue;

          reportMissingList(resource.type, firstOperation.operation);
        }
      },
      model(model) {
        // Check operations omitted by the resolver, including on otherwise resolved models.
        if (!isApplicableResource(context.program, model)) return;

        const instanceOperations = getResourceInstanceOperations(
          context.program,
          model,
          armServices,
        ).filter(({ httpOperation }) => !checkedOperations.has(httpOperation.operation));
        if (instanceOperations.length === 0) return;

        // Check lists within the same service; another service's matching route cannot satisfy this one.
        const hasAllCollectionGets = instanceOperations.every(
          ({ httpOperation, collectionPaths }) =>
            collectionPaths.has(getCollectionPath(httpOperation.path)),
        );
        if (hasAllCollectionGets) return;

        reportMissingList(model, instanceOperations[0].httpOperation.operation);
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

function getResourceInstanceOperations(
  program: Program,
  resource: Model,
  services: readonly ArmServiceOperations[],
) {
  // ARM calls individual-resource read/create/update/delete/existence operations "lifecycle" operations.
  const lifecycleOperations = new Set(
    [...(getArmOperationList(program, resource) ?? [])]
      .filter((op) => op.kind !== "list" && op.kind !== "action" && op.kind !== "other")
      .map((op) => op.operation),
  );

  return services.flatMap(({ operations, collectionPaths }) =>
    operations
      .filter(({ operation }) => {
        // An action can inherit a read template's metadata without being an individual-resource endpoint.
        if (getActionDetails(program, operation) !== undefined) return false;
        if (lifecycleOperations.has(operation)) return true;

        // Legacy/custom templates can describe resource operations using REST metadata without ARM registration.
        const restOperation = getResourceOperation(program, operation);
        return restOperation?.resourceType === resource && restOperation.operation !== "list";
      })
      .map((httpOperation) => ({ httpOperation, collectionPaths })),
  );
}

function getCollectionPath(instancePath: string): string {
  // /widgets/{widgetName}/parts/{partName} -> /widgets/{widgetName}/parts
  return normalizeRoute(instancePath.slice(0, instancePath.lastIndexOf("/")));
}

function normalizeRoute(path: string): string {
  return path.replace(/\{[^}]+\}/g, "{}").replace(/\/+$/, "");
}

function isCollectionGet(
  operation: HttpOperation,
  metadata: MetadataInfo,
  program: Program,
): boolean {
  if (operation.verb !== "get") return false;

  for (const response of operation.responses) {
    const isSuccess =
      typeof response.statusCodes === "number" &&
      response.statusCodes >= 200 &&
      response.statusCodes < 300;
    if (!isSuccess) continue;

    for (const { body } of response.responses) {
      if (body?.bodyKind !== "single" || body.type.kind !== "Model") continue;

      // Inspect the response-visible JSON payload: source names and request-only properties can differ.
      for (const [name, property] of walkJsonProperties(program, body.type)) {
        if (
          name === "value" &&
          metadata.isPayloadProperty(property, Visibility.Read, body.isExplicit) &&
          property.type.kind === "Model" &&
          isArrayModelType(property.type)
        ) {
          return true;
        }
      }
    }
  }
  return false;
}
