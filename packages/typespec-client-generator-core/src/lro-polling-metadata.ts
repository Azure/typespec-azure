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
import { $ } from "@typespec/compiler/typekit";
import { getLroOperationIdDecorators, getLroPollingMetadataDecorators } from "./decorators.js";
import type { TCGCContext } from "./interfaces.js";
import { createDiagnostic } from "./lib.js";
import { getLibraryName } from "./public-utils.js";
import type { SdkPropertyVisibilityPredicate } from "./types.js";

export interface ResolvedLroPollingMetadata {
  operationIdStrategy?: "lastPathSegment";
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

/** @internal */
export function getLroOperationIdLink(
  context: TCGCContext,
  statusMonitorStep: LroMetadata["statusMonitorStep"],
): OperationLink | undefined {
  const link = getStatusMonitorLink(statusMonitorStep);
  if (link?.location !== "Self") return link;
  return $(context.program).scalar.extendsUrl(link.property.type) ? link : undefined;
}

const resolutionCache = new WeakMap<
  TCGCContext,
  Map<Operation, ResolvedLroPollingMetadata | undefined>
>();

export function resolveLroPollingMetadata(
  context: TCGCContext,
  operation: Operation,
  isPropertyVisible: SdkPropertyVisibilityPredicate,
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

  const [value, diagnostics] = resolve(context, operation, isPropertyVisible);
  contextCache.set(operation, value);
  return [value, diagnostics];
}

function resolve(
  context: TCGCContext,
  operation: Operation,
  isPropertyVisible: SdkPropertyVisibilityPredicate,
): [ResolvedLroPollingMetadata | undefined, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const operationIdDecorators = getLroOperationIdDecorators(context, operation);

  const raw = getLroMetadata(context.program, operation);
  if (!raw) {
    if (operationIdDecorators.length > 0) {
      diagnostics.add(
        createDiagnostic({
          code: "lro-operation-id-non-lro",
          target: operation,
        }),
      );
    }
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

  let operationIdStrategy: "lastPathSegment" | undefined = operationIdDecorators[0]?.strategy;
  if (operationIdStrategy && !getLroOperationIdLink(context, raw.statusMonitorStep)) {
    diagnostics.add(
      createDiagnostic({
        code: "lro-operation-id-missing-link",
        target: operationIdDecorators[0].target,
      }),
    );
    operationIdStrategy = undefined;
  }

  const properties: ModelProperty[] = [];
  const seenNames = new Set<string>();
  if (operationIdStrategy) {
    seenNames.add("operationId");
  }

  for (const property of walkPropertiesInherited(raw.pollingInfo.responseModel)) {
    if (!isPropertyVisible(context, property)) continue;
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

  if (!operationIdStrategy && properties.length === 0 && diagnostics.diagnostics.length === 0) {
    return diagnostics.wrap(undefined);
  }
  return diagnostics.wrap({ operationIdStrategy, properties });
}
