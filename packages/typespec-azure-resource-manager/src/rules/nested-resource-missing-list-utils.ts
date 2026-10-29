import { isArrayModelType, type Operation, type Program } from "@typespec/compiler";
import {
  getAllHttpServices,
  Visibility,
  type HttpOperation,
  type MetadataInfo,
} from "@typespec/http";
import { getArmProviderNamespace } from "../namespace.js";
import { walkJsonProperties } from "./model-utils.js";

interface ArmServiceOperations {
  operations: readonly HttpOperation[];
  collectionPaths: ReadonlySet<string>;
}

export function createArmServiceIndex(program: Program, metadata: MetadataInfo) {
  const [services] = getAllHttpServices(program);
  const armServices = services
    // REST metadata also exists in non-ARM services. Do not apply ARM list requirements there.
    .filter((service) => getArmProviderNamespace(program, service.namespace) !== undefined)
    .map(({ operations }) => ({
      operations,
      collectionPaths: new Set(
        operations
          .filter((op) => isCollectionGet(op, metadata, program))
          .map((op) => normalizeRoute(op.path)),
      ),
    }));
  const serviceByOperation = new Map<Operation, ArmServiceOperations>();
  for (const service of armServices) {
    for (const { operation } of service.operations) {
      serviceByOperation.set(operation, service);
    }
  }
  return serviceByOperation;
}

export function hasHttpCollectionGet(
  operation: Operation,
  collectionPath: string,
  serviceByOperation: ReadonlyMap<Operation, ArmServiceOperations>,
): boolean {
  // Collection GETs authored as actions may be missing from the resolved graph or its lists.
  // https://github.com/Azure/typespec-azure/issues/5886; see also #5080.
  return serviceByOperation.get(operation)?.collectionPaths.has(collectionPath) ?? false;
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
