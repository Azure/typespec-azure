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
  const { finalStep, pollingInfo, resourceOperation } = protocol;
  let model: Model | Scalar | UnknownType | VoidType | "void" =
    protocol.isAction || resourceOperation?.operation === "delete"
      ? pollingInfo.responseModel
      : protocol.initialResponse;

  if (
    finalStep &&
    finalStep.kind !== "noPollingResult" &&
    (finalStep.kind !== "pollingSuccessProperty" ||
      resourceOperation?.operation !== "createOrReplace")
  ) {
    model = finalStep.responseModel;
  } else if (resourceOperation?.operation === "createOrReplace") {
    model = resourceOperation.resourceType;
  } else if (protocol.statusMonitorResult) {
    model = protocol.statusMonitorResult.type;
  }
  if (protocol.originalUriHasGetOperation === false) model = "void";

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

/** Native LRO metadata only; the legacy @markAsLro fallback is handled separately. */
export function getNativeLroMetadata(
  program: Program,
  operation: Operation,
): LroMetadata | undefined {
  const protocol = getLroProtocolMetadata(program, operation);
  if (!protocol) return undefined;
  return {
    operation: protocol.operation,
    finalStateVia: protocol.finalStateVia,
    statusMonitorStep: protocol.statusMonitorStep,
    pollingInfo: protocol.pollingInfo,
    finalStep: protocol.finalStep,
    ...resolveLroClientResult(protocol),
  };
}
