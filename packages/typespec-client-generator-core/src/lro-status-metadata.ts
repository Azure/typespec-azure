import type { LroMetadata } from "@azure-tools/typespec-azure-core";
import {
  createDiagnosticCollector,
  type Diagnostic,
  type ModelProperty,
  type Operation,
  walkPropertiesInherited,
} from "@typespec/compiler";
import { getLroStatusMetadataDecorator } from "./decorators.js";
import type { TCGCContext } from "./interfaces.js";
import { createDiagnostic } from "./lib.js";
import type { SdkPropertyVisibilityPredicate } from "./types.js";

export interface ResolvedLroStatusMetadata {
  properties: ModelProperty[];
}

type StatusMonitorLinkStep<TLink> =
  | { kind: "nextOperationLink"; target: TLink }
  | { kind: "nextOperationReference"; target: { link?: TLink } };

function getStatusMonitorLink<TLink>(
  statusMonitorStep: StatusMonitorLinkStep<TLink> | undefined,
): TLink | undefined {
  return statusMonitorStep?.kind === "nextOperationLink"
    ? statusMonitorStep.target
    : statusMonitorStep?.target.link;
}

const resolutionCache = new WeakMap<
  TCGCContext,
  Map<Operation, ResolvedLroStatusMetadata | undefined>
>();

export function resolveLroStatusMetadata(
  context: TCGCContext,
  operation: Operation,
  raw: LroMetadata | undefined,
  isPropertyVisible: SdkPropertyVisibilityPredicate,
): [ResolvedLroStatusMetadata | undefined, readonly Diagnostic[]] {
  let contextCache = resolutionCache.get(context);
  if (!contextCache) {
    contextCache = new Map();
    resolutionCache.set(context, contextCache);
  }
  const cached = contextCache.get(operation);
  if (contextCache.has(operation)) {
    return [cached, []];
  }

  const [value, diagnostics] = resolve(context, operation, raw, isPropertyVisible);
  contextCache.set(operation, value);
  return [value, diagnostics];
}

function resolve(
  context: TCGCContext,
  operation: Operation,
  raw: LroMetadata | undefined,
  isPropertyVisible: SdkPropertyVisibilityPredicate,
): [ResolvedLroStatusMetadata | undefined, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();

  if (!raw) {
    return diagnostics.wrap(undefined);
  }

  const properties: ModelProperty[] = [];

  for (const property of walkPropertiesInherited(raw.pollingInfo.responseModel)) {
    if (!isPropertyVisible(context, property)) continue;
    const metadataDecorator = getLroStatusMetadataDecorator(context, property);
    if (!metadataDecorator) continue;

    const structuralRole = getStructuralRole(raw, property);
    if (structuralRole) {
      diagnostics.add(
        createDiagnostic({
          code: "lro-status-metadata-structural-property",
          format: { propertyName: property.name, role: structuralRole },
          target: metadataDecorator.target,
        }),
      );
      continue;
    }

    properties.push(property);
  }

  if (properties.length === 0 && diagnostics.diagnostics.length === 0) {
    return diagnostics.wrap(undefined);
  }
  return diagnostics.wrap({ properties });
}

function getStructuralRole(
  raw: LroMetadata,
  property: ModelProperty,
): "status" | "result" | "error" | "location" | undefined {
  if (
    raw.pollingInfo.terminationStatus.kind === "model-property" &&
    raw.pollingInfo.terminationStatus.property === property
  ) {
    return "status";
  }
  if (raw.pollingInfo.resultProperty === property) return "result";
  if (raw.pollingInfo.errorProperty === property) return "error";
  if (getStatusMonitorLink(raw.statusMonitorStep)?.property === property) return "location";

  const finalStep = raw.finalStep;
  if (finalStep?.kind === "finalOperationLink" && finalStep.target.property === property) {
    return "location";
  }
  if (
    finalStep?.kind === "finalOperationReference" &&
    finalStep.target.link?.property === property
  ) {
    return "location";
  }
  return undefined;
}
