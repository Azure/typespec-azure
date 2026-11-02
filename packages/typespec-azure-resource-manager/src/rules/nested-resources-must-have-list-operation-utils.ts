import {
  getPagingOperation,
  isList,
  type Model,
  type Namespace,
  type Operation,
  type Program,
} from "@typespec/compiler";
import { getAllHttpServices, getHttpOperation, type HttpOperation } from "@typespec/http";
import { getResourceOperation } from "@typespec/rest";
import { getArmProviderNamespace } from "../namespace.js";
import { getArmResource } from "../resource.js";

export function createArmServiceIndex(program: Program) {
  const [services] = getAllHttpServices(program);
  const serviceByOperation = new Map<Operation, Namespace>();
  for (const service of services) {
    if (getArmProviderNamespace(program, service.namespace) === undefined) continue;
    for (const { operation } of service.operations) {
      serviceByOperation.set(operation, service.namespace);
    }
  }
  return serviceByOperation;
}

export function createSubscriptionListIndex(
  program: Program,
  serviceByOperation: ReadonlyMap<Operation, Namespace>,
) {
  const servicesByResource = new Map<Model, Set<Namespace>>();
  for (const [operation, service] of serviceByOperation) {
    if (!isList(program, operation)) continue;
    const [httpOperation] = getHttpOperation(program, operation);
    if (!isCollectionGet(httpOperation)) continue;

    const resourceOperation = getResourceOperation(program, operation);
    let resourceType =
      resourceOperation?.operation === "list" ? resourceOperation.resourceType : undefined;
    if (resourceType === undefined) {
      // Provider-level actions can identify their collection through explicit paging metadata.
      const [paging] = getPagingOperation(program, operation);
      const items = paging?.output.pageItems.property.type;
      const itemType = items?.kind === "Model" ? items.indexer?.value : undefined;
      if (itemType?.kind === "Model") resourceType = itemType;
    }
    if (resourceType === undefined) continue;

    const resource = getArmResource(program, resourceType);
    if (resource?.collectionName === undefined) continue;
    const subscriptionPath = `/subscriptions/{}/providers/${resource.armProviderNamespace}/${resource.collectionName}`;
    if (normalizeRoute(httpOperation.path) !== subscriptionPath) continue;

    let services = servicesByResource.get(resourceType);
    if (services === undefined) {
      services = new Set();
      servicesByResource.set(resourceType, services);
    }
    services.add(service);
  }
  return servicesByResource;
}

export function getCollectionPath(instancePath: string): string {
  // /widgets/{widgetName}/parts/{partName} -> /widgets/{widgetName}/parts
  return normalizeRoute(instancePath.slice(0, instancePath.lastIndexOf("/")));
}

export function normalizeRoute(path: string): string {
  return path.replace(/\{[^}]+\}/g, "{}").replace(/\/+$/, "");
}

export function isCollectionGet(operation: HttpOperation): boolean {
  return (
    operation.verb === "get" &&
    operation.responses.some(
      ({ statusCodes }) =>
        typeof statusCodes === "number" && statusCodes >= 200 && statusCodes < 300,
    )
  );
}
