import type { Namespace, Operation, Program } from "@typespec/compiler";
import { getAllHttpServices, type HttpOperation } from "@typespec/http";
import { getArmProviderNamespace } from "../namespace.js";

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
