import {
  getLroProtocolMetadata,
  type LroMetadata,
  type LroProtocolMetadata,
} from "@azure-tools/typespec-azure-core";
import {
  isVoidType,
  type Model,
  type Operation,
  type Program,
  type Scalar,
  type UnknownType,
  type VoidType,
} from "@typespec/compiler";
import { getClientLroResultReference } from "./decorators.js";
import type { ClientLroMetadata, TCGCContext } from "./interfaces.js";
import { createDiagnostic } from "./lib.js";
import { resolveClientLroResult } from "./lro-result.js";

type LroClientResult = Pick<
  LroMetadata,
  | "logicalResult"
  | "logicalPath"
  | "envelopeResult"
  | "finalResult"
  | "finalEnvelopeResult"
  | "finalResultPath"
>;

/**
 * Selects the client result without discovering or changing protocol facts.
 * Core keeps a separate compatibility policy for its combined metadata API.
 */
export function resolveLroClientResult(protocol: LroProtocolMetadata): LroClientResult {
  const { finalStep, originalUriHasGetOperation } = protocol.completion;
  const { pollingInfo, statusMonitorResult } = protocol.polling;
  const { initialResponse, resourceOperation, isAction } = protocol.initial;
  let model: Model | Scalar | UnknownType | VoidType | "void" =
    isAction || resourceOperation?.operation === "delete"
      ? pollingInfo.responseModel
      : initialResponse;

  if (finalStep && finalStep.kind !== "noPollingResult") {
    model = finalStep.responseModel;
  } else if (resourceOperation?.operation === "createOrReplace") {
    model = resourceOperation.resourceType;
  } else if (statusMonitorResult) {
    model = statusMonitorResult.type;
  }
  if (originalUriHasGetOperation === false) model = "void";

  let finalResult: Model | Scalar | UnknownType | "void" =
    model === "void" || isVoidType(model) ? "void" : model;
  let finalEnvelopeResult = finalResult;
  if (finalStep?.kind === "pollingSuccessProperty") {
    finalEnvelopeResult = pollingInfo.responseModel;
  } else if (finalStep?.kind === "noPollingResult") {
    finalResult = "void";
    finalEnvelopeResult = "void";
  }
  const path = finalStep?.kind === "pollingSuccessProperty" ? finalStep.target.name : undefined;
  return {
    logicalResult: model !== "void" && model.kind === "Model" ? model : pollingInfo.responseModel,
    logicalPath: path,
    envelopeResult: pollingInfo.responseModel,
    finalResult,
    finalEnvelopeResult,
    finalResultPath: path,
  };
}

/** Raw LRO metadata only; the legacy @markAsLro fallback is handled separately. */
export function getRawLroMetadata(program: Program, operation: Operation): LroMetadata | undefined {
  const protocol = getLroProtocolMetadata(program, operation);
  if (!protocol) return undefined;
  return {
    operation: protocol.operation,
    finalStateVia: protocol.completion.finalStateVia,
    statusMonitorStep: protocol.polling.statusMonitorStep,
    pollingInfo: protocol.polling.pollingInfo,
    finalStep: protocol.completion.finalStep,
    ...resolveLroClientResult(protocol),
  };
}

/** Select once per SDK context so method construction and usage analysis agree. */
export function getClientLroMetadata(
  context: TCGCContext,
  operation: Operation,
): ClientLroMetadata | undefined {
  const cache = (context.__clientLroMetadataCache ??= new Map());
  if (cache.has(operation)) return cache.get(operation);
  const reference = getClientLroResultReference(context, operation);
  if (!reference) {
    const metadata = getRawLroMetadata(context.program, operation);
    cache.set(operation, metadata);
    return metadata;
  }

  const protocol = getLroProtocolMetadata(context.program, operation);
  const [selection, diagnostics] = resolveClientLroResult(
    context.program,
    operation,
    protocol,
    reference,
  );
  context.diagnostics = [...context.diagnostics, ...diagnostics];
  cache.set(operation, undefined);
  if (!selection || !protocol) return undefined;
  if (selection.requiresAdvancedSupport && !context.supportsAdvancedLroResultSelection) {
    context.diagnostics = [
      ...context.diagnostics,
      createDiagnostic({ code: "unsupported-client-lro-result", target: reference.target }),
    ];
    return undefined;
  }

  const path = selection.properties.length === 1 ? selection.properties[0].name : undefined;
  const metadata: ClientLroMetadata = {
    operation,
    finalStateVia: protocol.completion.finalStateVia,
    statusMonitorStep: protocol.polling.statusMonitorStep,
    pollingInfo: protocol.polling.pollingInfo,
    finalStep: protocol.completion.finalStep,
    envelopeResult: protocol.polling.pollingInfo.responseModel,
    logicalResult: selection.result.kind === "Model" ? selection.result : selection.model,
    logicalPath: path,
    finalResult: selection.result,
    finalEnvelopeResult: selection.model,
    finalResultPath: path,
    finalResultSource: selection.source,
    finalResultSegments: selection.properties,
  };
  cache.set(operation, metadata);
  return metadata;
}
