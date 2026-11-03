import {
  getLroProtocolMetadata,
  type LroMetadata,
  type LroProtocolMetadata,
} from "@azure-tools/typespec-azure-core";
import {
  createDiagnosticCollector,
  isUnknownType,
  isVoidType,
  type Diagnostic,
  type DiagnosticResult,
  type Model,
  type ModelProperty,
  type Operation,
  type Program,
  type Scalar,
  type UnknownType,
  type VoidType,
} from "@typespec/compiler";
import { getClientLroResult } from "./decorators.js";
import type { TCGCContext } from "./interfaces.js";
import { findRootSourceProperty } from "./internal-utils.js";
import { createDiagnostic } from "./lib.js";

type LroClientResult = Pick<
  LroMetadata,
  | "logicalResult"
  | "logicalPath"
  | "envelopeResult"
  | "finalResult"
  | "finalEnvelopeResult"
  | "finalResultPath"
>;

const rawLroProtocolMetadataCache = new WeakMap<
  Program,
  Map<Operation, LroProtocolMetadata | undefined>
>();

/** Returns cached Azure.Core protocol facts without applying TCGC client-result policy. @internal */
export function getCachedLroProtocolMetadata(
  program: Program,
  operation: Operation,
): LroProtocolMetadata | undefined {
  let programCache = rawLroProtocolMetadataCache.get(program);
  if (!programCache) {
    programCache = new Map();
    rawLroProtocolMetadataCache.set(program, programCache);
  }
  if (!programCache.has(operation)) {
    programCache.set(operation, getLroProtocolMetadata(program, operation));
  }
  return programCache.get(operation);
}

/**
 * Selects the client result without discovering or changing protocol facts.
 * Core keeps a separate compatibility policy for its combined metadata API.
 */
export function resolveLroClientResult(protocol: LroProtocolMetadata): LroClientResult {
  const { finalStep, originalUriHasGetOperation } = protocol.completion;
  const { pollingInfo, statusMonitorResult } = protocol.polling;
  const { initialResponse, resourceOperation, isAction } = protocol.initial;
  let resultPath: string | undefined;
  let model: Model | Scalar | UnknownType | VoidType | "void" =
    isAction || resourceOperation?.operation === "delete"
      ? pollingInfo.responseModel
      : initialResponse;

  if (
    finalStep &&
    finalStep.kind !== "noPollingResult" &&
    (finalStep.kind !== "pollingSuccessProperty" ||
      resourceOperation?.operation !== "createOrReplace")
  ) {
    model = finalStep.responseModel;
    // finalResultPath is valid only when finalResult comes from pollingSuccessProperty.
    resultPath = finalStep.kind === "pollingSuccessProperty" ? finalStep.target.name : undefined;
  } else if (resourceOperation?.operation === "createOrReplace") {
    model = resourceOperation.resourceType;
  } else if (statusMonitorResult) {
    model = statusMonitorResult.type;
  }
  if (originalUriHasGetOperation === false) model = "void";

  let finalResult: Model | Scalar | UnknownType | "void" =
    model === "void" || isVoidType(model) ? "void" : model;
  let finalEnvelopeResult = finalResult;
  if (resultPath !== undefined) {
    finalEnvelopeResult = pollingInfo.responseModel;
  } else if (finalStep?.kind === "noPollingResult") {
    finalResult = "void";
    finalEnvelopeResult = "void";
  }
  return {
    logicalResult: model !== "void" && model.kind === "Model" ? model : pollingInfo.responseModel,
    logicalPath: resultPath,
    envelopeResult: pollingInfo.responseModel,
    finalResult,
    finalEnvelopeResult,
    finalResultPath: resultPath,
  };
}

/** @internal */
export function isLroProtocolResultProperty(
  protocol: LroProtocolMetadata,
  property: ModelProperty,
): boolean {
  const finalStep = protocol.completion.finalStep;
  const resultProperty =
    finalStep?.kind === "pollingSuccessProperty"
      ? finalStep.target
      : (protocol.polling.statusMonitorResult?.property ??
        protocol.polling.pollingInfo.resultProperty);
  if (resultProperty === undefined) return false;
  return (
    resultProperty === property ||
    findRootSourceProperty(resultProperty) === findRootSourceProperty(property)
  );
}

function createLroMetadata(
  protocol: LroProtocolMetadata,
  clientResult: LroClientResult,
): LroMetadata {
  return {
    operation: protocol.operation,
    finalStateVia: protocol.completion.finalStateVia,
    statusMonitorStep: protocol.polling.statusMonitorStep,
    pollingInfo: protocol.polling.pollingInfo,
    finalStep: protocol.completion.finalStep,
    ...clientResult,
  };
}

/** Raw LRO metadata only; the legacy @markAsLro fallback is handled separately. */
export function getRawLroMetadata(program: Program, operation: Operation): LroMetadata | undefined {
  const protocol = getCachedLroProtocolMetadata(program, operation);
  return protocol ? createLroMetadata(protocol, resolveLroClientResult(protocol)) : undefined;
}

/** Resolves the effective client result without changing the LRO protocol metadata. */
export function getClientLroMetadataWithDiagnostics(
  context: TCGCContext,
  operation: Operation,
): [LroMetadata | undefined, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const selection = getClientLroResult(context, operation);

  // Keep the default TCGC result policy when no selection applies to the current emitter scope.
  if (!selection) {
    return diagnostics.wrap(getRawLroMetadata(context.program, operation));
  }

  // A client result selection customizes a native LRO; it does not create LRO metadata.
  const protocol = getCachedLroProtocolMetadata(context.program, operation);
  if (!protocol) {
    diagnostics.add(
      createDiagnostic({
        code: "invalid-client-lro-result",
        target: selection,
        format: { reason: "@clientLroResult requires a discoverable LRO protocol." },
      }),
    );
    return diagnostics.wrap(undefined);
  }
  const clientResult = diagnostics.pipe(resolveClientLroResultSelection(protocol, selection));
  // Continue SDK type construction with the default result after reporting an invalid selection.
  return diagnostics.wrap(
    createLroMetadata(protocol, clientResult ?? resolveLroClientResult(protocol)),
  );
}

function resolveClientLroResultSelection(
  protocol: LroProtocolMetadata,
  selection: Model | ModelProperty,
): DiagnosticResult<LroClientResult | undefined> {
  const diagnostics = createDiagnosticCollector();
  if (selection.kind === "Model") {
    // Accept only model identities used as response bodies by the existing completion protocol.
    const responses: Model[] = [];
    const finalStep = protocol.completion.finalStep;
    if (
      finalStep &&
      (finalStep.kind === "finalOperationLink" || finalStep.kind === "finalOperationReference") &&
      finalStep.responseModel.kind === "Model"
    ) {
      responses.push(finalStep.responseModel);
    }

    const resourceOperation = protocol.initial.resourceOperation;
    if (resourceOperation?.operation === "delete") {
      responses.push(protocol.polling.pollingInfo.responseModel);
    } else if (resourceOperation) {
      responses.push(protocol.initial.initialResponse, resourceOperation.resourceType);
    } else {
      responses.push(protocol.polling.pollingInfo.responseModel);
    }

    const response = responses.find((candidate) => candidate === selection);
    if (!response) {
      diagnostics.add(
        createDiagnostic({
          code: "invalid-client-lro-result",
          target: selection,
          format: {
            reason: "The selected model is not a response body available from the LRO protocol.",
          },
        }),
      );
      return diagnostics.wrap(undefined);
    }

    return diagnostics.wrap({
      logicalResult: response,
      logicalPath: undefined,
      envelopeResult: protocol.polling.pollingInfo.responseModel,
      finalResult: response,
      finalEnvelopeResult: response,
      finalResultPath: undefined,
    });
  }

  const statusMonitorResult = protocol.polling.statusMonitorResult;
  const finalStep = protocol.completion.finalStep;
  const resultType =
    finalStep?.kind === "pollingSuccessProperty"
      ? finalStep.responseModel
      : (statusMonitorResult?.type ?? protocol.polling.pollingInfo.resultProperty?.type);
  // Accept only the direct protocol result property; arbitrary and nested paths are unsupported.
  if (
    !isLroProtocolResultProperty(protocol, selection) ||
    !resultType ||
    (resultType.kind !== "Model" && resultType.kind !== "Scalar" && !isUnknownType(resultType))
  ) {
    diagnostics.add(
      createDiagnostic({
        code: "invalid-client-lro-result",
        target: selection,
        format: {
          reason: "The selected property is not the LRO protocol's established result property.",
        },
      }),
    );
    return diagnostics.wrap(undefined);
  }
  const path = selection.name;
  const envelope = protocol.polling.pollingInfo.responseModel;
  return diagnostics.wrap({
    logicalResult: resultType.kind === "Model" ? resultType : envelope,
    logicalPath: path,
    envelopeResult: envelope,
    finalResult: resultType,
    finalEnvelopeResult: envelope,
    finalResultPath: path,
  });
}
