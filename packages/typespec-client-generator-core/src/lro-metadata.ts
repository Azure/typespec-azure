import {
  getLroProtocolMetadata,
  type LroMetadata,
  type LroProtocolMetadata,
} from "@azure-tools/typespec-azure-core";
import {
  createDiagnosticCollector,
  isUnknownType,
  isVoidType,
  walkPropertiesInherited,
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
  const protocol = getLroProtocolMetadata(program, operation);
  return protocol ? createLroMetadata(protocol, resolveLroClientResult(protocol)) : undefined;
}

/** @internal */
export function getLroEnvelopeProperty(
  envelope: Model,
  selection: ModelProperty,
): ModelProperty | undefined {
  return Array.from(walkPropertiesInherited(envelope)).find(
    (property) =>
      property === selection ||
      findRootSourceProperty(property) === findRootSourceProperty(selection),
  );
}

/** Resolves the effective client result without changing the LRO protocol metadata. */
export function getClientLroMetadataWithDiagnostics(
  context: TCGCContext,
  operation: Operation,
): [LroMetadata | undefined, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const selection = getClientLroResult(context, operation);
  const metadata = getRawLroMetadata(context.program, operation);

  // Keep the default TCGC result policy when no selection applies to the current emitter scope.
  if (!selection) {
    return diagnostics.wrap(metadata);
  }

  // A client result selection customizes a native LRO; it does not create LRO metadata.
  if (!metadata) {
    diagnostics.add(
      createDiagnostic({
        code: "invalid-client-lro-result",
        target: selection,
        format: { reason: "@clientLroResult requires a discoverable LRO protocol." },
      }),
    );
    return diagnostics.wrap(undefined);
  }
  const clientResult = diagnostics.pipe(resolveClientLroResultSelection(metadata, selection));
  // Continue SDK type construction with the default result after reporting an invalid selection.
  return diagnostics.wrap(clientResult ? { ...metadata, ...clientResult } : metadata);
}

function resolveClientLroResultSelection(
  metadata: LroMetadata,
  selection: Model | ModelProperty,
): DiagnosticResult<LroClientResult | undefined> {
  const diagnostics = createDiagnosticCollector();
  if (selection.kind === "Model") {
    if (metadata.finalEnvelopeResult !== selection && metadata.envelopeResult !== selection) {
      diagnostics.add(
        createDiagnostic({
          code: "invalid-client-lro-result",
          target: selection,
          format: {
            reason: "The selected model is not an envelope response of the LRO.",
          },
        }),
      );
      return diagnostics.wrap(undefined);
    }

    return diagnostics.wrap({
      logicalResult: selection,
      logicalPath: undefined,
      envelopeResult: metadata.envelopeResult,
      finalResult: selection,
      finalEnvelopeResult: selection,
      finalResultPath: undefined,
    });
  }

  const envelopeProperty = getLroEnvelopeProperty(metadata.envelopeResult, selection);
  if (!envelopeProperty) {
    diagnostics.add(
      createDiagnostic({
        code: "invalid-client-lro-result",
        target: selection,
        format: {
          reason:
            "The selected property is not a supported direct property of the LRO envelope response.",
        },
      }),
    );
    return diagnostics.wrap(undefined);
  }

  const resultType = envelopeProperty.type;
  if (resultType.kind !== "Model" && resultType.kind !== "Scalar" && !isUnknownType(resultType)) {
    diagnostics.add(
      createDiagnostic({
        code: "invalid-client-lro-result",
        target: selection,
        format: {
          reason:
            "The selected property is not a supported direct property of the LRO envelope response.",
        },
      }),
    );
    return diagnostics.wrap(undefined);
  }

  const path = envelopeProperty.name;
  const envelope = metadata.envelopeResult;
  return diagnostics.wrap({
    logicalResult: resultType.kind === "Model" ? resultType : envelope,
    logicalPath: path,
    envelopeResult: envelope,
    finalResult: resultType,
    finalEnvelopeResult: envelope,
    finalResultPath: path,
  });
}
