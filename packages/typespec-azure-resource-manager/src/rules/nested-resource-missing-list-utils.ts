import { isArrayModelType, type Namespace, type Operation, type Program } from "@typespec/compiler";
import {
  getAllHttpServices,
  Visibility,
  type HttpOperation,
  type MetadataInfo,
} from "@typespec/http";
import { getArmProviderNamespace } from "../namespace.js";
import { walkJsonProperties } from "./model-utils.js";

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

export function isCollectionGet(
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
      // Inspect response-visible JSON names, excluding request-only and non-payload properties.
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
