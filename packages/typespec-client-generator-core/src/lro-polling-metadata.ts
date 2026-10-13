import {
  getLroMetadata,
  type LroMetadata,
  type OperationLink,
} from "@azure-tools/typespec-azure-core";
import {
  createDiagnosticCollector,
  type Diagnostic,
  type ModelProperty,
  type Operation,
  walkPropertiesInherited,
} from "@typespec/compiler";
import { getLroInstanceIdDecorators, getLroPollingMetadataDecorators } from "./decorators.js";
import type { TCGCContext } from "./interfaces.js";
import { createDiagnostic } from "./lib.js";
import { getLibraryName } from "./public-utils.js";

export interface ResolvedLroPollingMetadata {
  instanceIdStrategy?: "lastPathSegment";
  properties: ModelProperty[];
}

type StatusMonitorLinkStep<TLink> =
  | { kind: "nextOperationLink"; target: TLink }
  | { kind: "nextOperationReference"; target: { link?: TLink } };

/** @internal */
export function getStatusMonitorLink<TLink>(
  statusMonitorStep: StatusMonitorLinkStep<TLink> | undefined,
): TLink | undefined {
  return statusMonitorStep?.kind === "nextOperationLink"
    ? statusMonitorStep.target
    : statusMonitorStep?.target.link;
}

function getLroInstanceIdLink(
  statusMonitorStep: LroMetadata["statusMonitorStep"],
): OperationLink | undefined {
  const link = getStatusMonitorLink(statusMonitorStep);
  return link?.location === "Self" ? undefined : link;
}

const resolutionCache = new WeakMap<
  TCGCContext,
  Map<Operation, ResolvedLroPollingMetadata | undefined>
>();

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
  if (contextCache.has(operation)) {
    return [cached, []];
  }

  const [value, diagnostics] = resolve(context, operation);
  contextCache.set(operation, value);
  return [value, diagnostics];
}

function resolve(
  context: TCGCContext,
  operation: Operation,
): [ResolvedLroPollingMetadata | undefined, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const instanceIdDecorators = getLroInstanceIdDecorators(context, operation);

  const raw = getLroMetadata(context.program, operation);
  if (!raw) {
    if (instanceIdDecorators.length > 0) {
      diagnostics.add(
        createDiagnostic({
          code: "lro-instance-id-non-lro",
          target: operation,
        }),
      );
    }
    return diagnostics.wrap(undefined);
  }

  if (instanceIdDecorators.length > 1) {
    diagnostics.add(
      createDiagnostic({
        code: "lro-instance-id-duplicate",
        target: instanceIdDecorators[1].target,
      }),
    );
  }

  let instanceIdStrategy: "lastPathSegment" | undefined = instanceIdDecorators[0]?.strategy;
  if (instanceIdStrategy && !getLroInstanceIdLink(raw.statusMonitorStep)) {
    diagnostics.add(
      createDiagnostic({
        code: "lro-instance-id-missing-link",
        target: instanceIdDecorators[0].target,
      }),
    );
    instanceIdStrategy = undefined;
  }

  const properties: ModelProperty[] = [];
  const seenNames = new Set<string>();
  if (instanceIdStrategy) {
    seenNames.add("instanceId");
  }

  for (const property of walkPropertiesInherited(raw.pollingInfo.responseModel)) {
    const metadataDecorators = getLroPollingMetadataDecorators(context, property);
    if (metadataDecorators.length === 0) continue;

    if (metadataDecorators.length > 1) {
      diagnostics.add(
        createDiagnostic({
          code: "lro-polling-metadata-duplicate",
          format: { propertyName: property.name },
          target: metadataDecorators[1].target,
        }),
      );
    }

    const clientName = getLibraryName(context, property);
    if (seenNames.has(clientName)) {
      diagnostics.add(
        createDiagnostic({
          code: "lro-polling-metadata-name-conflict",
          format: { clientName },
          target: metadataDecorators[0].target,
        }),
      );
      continue;
    }
    seenNames.add(clientName);
    properties.push(property);
  }

  if (!instanceIdStrategy && properties.length === 0 && diagnostics.diagnostics.length === 0) {
    return diagnostics.wrap(undefined);
  }
  return diagnostics.wrap({ instanceIdStrategy, properties });
}
