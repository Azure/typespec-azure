import { getLroMetadata, type LroMetadata } from "@azure-tools/typespec-azure-core";
import {
  createDiagnosticCollector,
  type Diagnostic,
  type DiagnosticTarget,
  type Model,
  type ModelProperty,
  type Operation,
  type Type,
} from "@typespec/compiler";
import {
  getAccessOverride,
  getLroOperationIdDecorators,
  getLroPollingMetadataDecorators,
} from "./decorators.js";
import type { TCGCContext } from "./interfaces.js";
import { createDiagnostic } from "./lib.js";
import { getLibraryName } from "./public-utils.js";

export interface ResolvedLroPollingMetadata {
  raw: LroMetadata;
  operationId: boolean;
  properties: ModelProperty[];
}

interface CachedResolution {
  value: ResolvedLroPollingMetadata | undefined;
  diagnostics: readonly Diagnostic[];
  diagnosticsReturned: boolean;
}

const resolutionCache = new WeakMap<TCGCContext, Map<Operation, CachedResolution>>();

export function resolveLroPollingMetadata(
  context: TCGCContext,
  operation: Operation,
): [ResolvedLroPollingMetadata | undefined, readonly Diagnostic[]] {
  let contextCache = resolutionCache.get(context);
  if (!contextCache) {
    contextCache = new Map();
    resolutionCache.set(context, contextCache);
  }
  const cached = contextCache.get(operation);
  if (cached) {
    if (cached.diagnosticsReturned) return [cached.value, []];
    cached.diagnosticsReturned = true;
    return [cached.value, cached.diagnostics];
  }

  const [value, diagnostics] = resolve(context, operation);
  contextCache.set(operation, { value, diagnostics, diagnosticsReturned: true });
  return [value, diagnostics];
}

function resolve(
  context: TCGCContext,
  operation: Operation,
): [ResolvedLroPollingMetadata | undefined, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const operationIdDecorators = getLroOperationIdDecorators(context, operation);
  const metadataDecorators = getLroPollingMetadataDecorators(context, operation);
  if (operationIdDecorators.length === 0 && metadataDecorators.length === 0) {
    return diagnostics.wrap(undefined);
  }

  const raw = getLroMetadata(context.program, operation);
  if (!raw) {
    diagnostics.add(
      createDiagnostic({
        code: "lro-polling-metadata-non-lro",
        target: operation,
      }),
    );
    return diagnostics.wrap(undefined);
  }

  if (operationIdDecorators.length > 1) {
    diagnostics.add(
      createDiagnostic({
        code: "lro-operation-id-duplicate",
        target: operationIdDecorators[1].target,
      }),
    );
  }

  let operationId = operationIdDecorators.length > 0;
  if (
    operationId &&
    (raw.statusMonitorStep?.kind !== "nextOperationLink" ||
      raw.statusMonitorStep.target.location === "Self")
  ) {
    diagnostics.add(
      createDiagnostic({
        code: "lro-operation-id-missing-link",
        target: operationIdDecorators[0].target,
      }),
    );
    operationId = false;
  }

  const properties: ModelProperty[] = [];
  const seenProperties = new Set<ModelProperty>();
  const seenNames = new Map<string, DiagnosticTarget>();
  if (operationId) {
    seenNames.set("operationId", operationIdDecorators[0].target);
  }

  for (const entry of metadataDecorators) {
    if (seenProperties.has(entry.property)) {
      diagnostics.add(
        createDiagnostic({
          code: "lro-polling-metadata-duplicate",
          format: { propertyName: entry.property.name },
          target: entry.target,
        }),
      );
      continue;
    }
    seenProperties.add(entry.property);

    if (!isDirectOrInheritedProperty(raw.pollingInfo.responseModel, entry.property)) {
      diagnostics.add(
        createDiagnostic({
          code: "lro-polling-metadata-unreachable",
          format: { propertyName: entry.property.name },
          target: entry.target,
        }),
      );
      continue;
    }

    const clientName = getLibraryName(context, entry.property);
    if (seenNames.has(clientName)) {
      diagnostics.add(
        createDiagnostic({
          code: "lro-polling-metadata-name-conflict",
          format: { clientName },
          target: entry.target,
        }),
      );
      continue;
    }
    seenNames.set(clientName, entry.target);

    if (
      (getAccessOverride(context, operation) ?? "public") === "public" &&
      hasExplicitInternalAccess(context, entry.property, new Set())
    ) {
      diagnostics.add(
        createDiagnostic({
          code: "lro-polling-metadata-internal-conflict",
          format: { propertyName: entry.property.name },
          target: entry.target,
        }),
      );
      continue;
    }
    properties.push(entry.property);
  }

  return diagnostics.wrap({ raw, operationId, properties });
}

function isDirectOrInheritedProperty(model: Model, property: ModelProperty): boolean {
  let current: Model | undefined = model;
  while (current) {
    if ([...current.properties.values()].includes(property)) return true;
    current = current.baseModel;
  }
  return false;
}

function hasExplicitInternalAccess(context: TCGCContext, type: Type, visited: Set<Type>): boolean {
  if (visited.has(type)) return false;
  visited.add(type);

  if (
    (type.kind === "ModelProperty" ||
      type.kind === "Model" ||
      type.kind === "Enum" ||
      type.kind === "Union") &&
    getAccessOverride(context, type) === "internal"
  ) {
    return true;
  }

  switch (type.kind) {
    case "ModelProperty":
      return hasExplicitInternalAccess(context, type.type, visited);
    case "Model":
      return (
        (type.baseModel !== undefined &&
          hasExplicitInternalAccess(context, type.baseModel, visited)) ||
        [...type.properties.values()].some((property) =>
          hasExplicitInternalAccess(context, property, visited),
        ) ||
        (type.indexer !== undefined &&
          hasExplicitInternalAccess(context, type.indexer.value, visited))
      );
    case "Union":
      return [...type.variants.values()].some((variant) =>
        hasExplicitInternalAccess(context, variant.type, visited),
      );
    default:
      return false;
  }
}
