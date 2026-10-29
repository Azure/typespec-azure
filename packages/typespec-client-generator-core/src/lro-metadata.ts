import {
  getLroProtocolMetadata,
  type LroMetadata,
  type LroProtocolMetadata,
} from "@azure-tools/typespec-azure-core";
import {
  createDiagnosticCollector,
  isVoidType,
  walkPropertiesInherited,
  type Diagnostic,
  type Entity,
  type Model,
  type ModelProperty,
  type Operation,
  type Program,
  type Scalar,
  type Type,
  type UnknownType,
  type VoidType,
} from "@typespec/compiler";
import { unsafe_Realm } from "@typespec/compiler/experimental";
import { isMetadata, isVisible, Visibility } from "@typespec/http";
import { getClientLroResultReference } from "./decorators.js";
import type { TCGCContext } from "./interfaces.js";
import type { ClientLroResultReference } from "./internal-utils.js";
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

interface ClientLroResultSelection {
  model: Model;
  properties: ModelProperty[];
  result: Model | Scalar;
}

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
export function getClientLroMetadataWithDiagnostics(
  context: TCGCContext,
  operation: Operation,
): [LroMetadata | undefined, readonly Diagnostic[]] {
  const cache = (context.__clientLroMetadataCache ??= new Map());
  const cached = cache.get(operation);
  if (cached) return [cached.metadata, cached.diagnostics];
  const diagnostics = createDiagnosticCollector();
  const protocol = getLroProtocolMetadata(context.program, operation);
  const reference = getClientLroResultReference(context, operation);
  let result: LroClientResult | undefined;
  let resultProperties: ModelProperty[] | undefined;
  if (reference) {
    const selection = diagnostics.pipe(
      resolveClientLroResult(context.program, protocol, reference),
    );
    if (selection && protocol) {
      resultProperties = selection.properties;
      const path = resultProperties.length === 1 ? resultProperties[0].name : undefined;
      result = {
        envelopeResult: protocol.polling.pollingInfo.responseModel,
        logicalResult: selection.result.kind === "Model" ? selection.result : selection.model,
        logicalPath: path,
        finalResult: selection.result,
        finalEnvelopeResult: selection.model,
        finalResultPath: path,
      };
    }
  } else if (protocol) {
    result = resolveLroClientResult(protocol);
  }

  const metadata =
    protocol && result
      ? {
          operation: protocol.operation,
          finalStateVia: protocol.completion.finalStateVia,
          statusMonitorStep: protocol.polling.statusMonitorStep,
          pollingInfo: protocol.polling.pollingInfo,
          finalStep: protocol.completion.finalStep,
          ...result,
        }
      : undefined;
  cache.set(operation, { metadata, resultProperties, diagnostics: diagnostics.diagnostics });
  return diagnostics.wrap(metadata);
}

/** @internal */
export function getClientLroResultProperties(
  context: TCGCContext,
  operation: Operation,
): ModelProperty[] | undefined {
  return context.__clientLroMetadataCache?.get(operation)?.resultProperties;
}

/** @internal */
export function resolveClientLroResult(
  program: Program,
  protocol: LroProtocolMetadata | undefined,
  reference: ClientLroResultReference,
): [ClientLroResultSelection | undefined, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  function reject(
    code: "invalid-client-lro-result" | "unsupported-client-lro-result",
    reason: string,
  ) {
    diagnostics.add(
      createDiagnostic({
        code,
        target: reference.diagnosticTarget,
        format: { reason },
      }),
    );
    return diagnostics.wrap(undefined);
  }
  if (!protocol) {
    return reject(
      "invalid-client-lro-result",
      "@clientLroResult requires a discoverable LRO protocol.",
    );
  }
  const finalStep = protocol.completion.finalStep;
  if (finalStep?.kind === "noPollingResult") {
    return reject(
      "unsupported-client-lro-result",
      "The existing LRO completion strategy does not produce a client result.",
    );
  }
  const envelope = resolveLroClientResult(protocol).finalEnvelopeResult;
  if (!envelope || envelope === "void" || envelope.kind !== "Model") {
    return reject(
      "invalid-client-lro-result",
      "The existing LRO completion response does not expose a model body that @clientLroResult can select.",
    );
  }
  const properties = resolveClientLroResultPath(envelope, reference);
  if (!properties) {
    if (resolveClientLroResultPath(protocol.polling.pollingInfo.responseModel, reference)) {
      return reject(
        "unsupported-client-lro-result",
        "The selection must use the existing LRO completion response without retaining the polling response.",
      );
    }
    return reject(
      "invalid-client-lro-result",
      "The reference does not select a response body or property of this operation's established LRO completion response.",
    );
  }
  for (const property of properties) {
    if (isMetadata(program, property) || !isVisible(program, property, Visibility.Read)) {
      return reject(
        "invalid-client-lro-result",
        "The selected path must contain only readable response-body properties.",
      );
    }
    if (
      property.optional &&
      !(
        properties.length === 1 &&
        finalStep?.kind === "pollingSuccessProperty" &&
        sameProperty(property, protocol.polling.pollingInfo.resultProperty)
      )
    ) {
      return reject(
        "invalid-client-lro-result",
        "Optional result properties require a missing-value contract and are not supported by @clientLroResult.",
      );
    }
  }
  const result = properties.at(-1)?.type ?? envelope;
  if (result.kind !== "Model" && result.kind !== "Scalar") {
    return reject(
      "invalid-client-lro-result",
      "@clientLroResult requires a model, scalar, or array result without null or union traversal.",
    );
  }
  return diagnostics.wrap({
    model: envelope,
    properties,
    result,
  });
}

function resolveClientLroResultPath(
  envelope: Model,
  reference: ClientLroResultReference,
): ModelProperty[] | undefined {
  if (reference.result.kind === "Model") {
    return sameTypeInstance(envelope, reference.result) ? [] : undefined;
  }
  const path = reference.propertyPath ?? [reference.result];
  const properties: ModelProperty[] = [];
  let type: Type = envelope;
  for (const referenceProperty of path) {
    const property: ModelProperty | undefined =
      type.kind === "Model" ? getProperty(type, referenceProperty) : undefined;
    if (!property) return undefined;
    properties.push(property);
    type = property.type;
  }
  return properties;
}

function getProperty(model: Model, reference: ModelProperty): ModelProperty | undefined {
  for (const property of walkPropertiesInherited(model)) {
    if (sameProperty(property, reference)) return property;
  }
  return undefined;
}

/** @internal */
export function preservesLroPagingPath(
  selection: LroMetadata,
  baseline: LroMetadata,
  pagingPath: ModelProperty[],
  selectedPath: ModelProperty[],
): boolean {
  const envelope = baseline.finalEnvelopeResult;
  const selectedEnvelope = selection.finalEnvelopeResult;
  const pagingRoot = pagingPath[0]?.model;
  if (
    !envelope ||
    envelope === "void" ||
    envelope.kind !== "Model" ||
    !selectedEnvelope ||
    selectedEnvelope === "void" ||
    selectedEnvelope.kind !== "Model" ||
    !pagingRoot
  ) {
    return false;
  }
  const baselinePath =
    baseline.finalStep?.kind === "pollingSuccessProperty" ? [baseline.finalStep.target] : [];
  const canonical = alignPaths(envelope, baselinePath, pagingRoot, pagingPath);
  if (!canonical) return false;
  return alignPaths(selectedEnvelope, selectedPath, envelope, canonical) !== undefined;
}

function alignPaths(
  selectedRoot: Model,
  selected: ModelProperty[],
  declaredRoot: Model,
  declared: ModelProperty[],
): ModelProperty[] | undefined {
  const selectedModels = pathModels(selectedRoot, selected);
  const declaredModels = pathModels(declaredRoot, declared);
  // A shared leaf model must not hide a mismatch at an earlier, shared response ancestor.
  for (let i = 0; i < selectedModels.length; i++) {
    for (let j = 0; j < declaredModels.length; j++) {
      if (!compatibleModels(selectedModels[i], declaredModels[j])) continue;
      const suffix = selected.slice(i);
      if (
        suffix.length > declared.length - j ||
        !suffix.every((property, index) => sameProperty(property, declared[j + index]))
      ) {
        return undefined;
      }
      return [...selected.slice(0, i), ...declared.slice(j)];
    }
  }
  return undefined;
}

function pathModels(root: Model, path: ModelProperty[]): Model[] {
  const models = [root];
  for (const property of path) {
    if (property.type.kind !== "Model") break;
    models.push(property.type);
  }
  return models;
}

function compatibleModels(left: Model, right: Model): boolean {
  for (let current: Model | undefined = left; current; current = current.baseModel) {
    if (sameTypeInstance(current, right)) return true;
  }
  for (let current: Model | undefined = right; current; current = current.baseModel) {
    if (sameTypeInstance(left, current)) return true;
  }
  return false;
}

function sameProperty(left: ModelProperty, right: ModelProperty | undefined): boolean {
  if (!right) return false;
  return (
    left === right ||
    (left.node !== undefined &&
      left.node === right.node &&
      left.model !== undefined &&
      right.model !== undefined &&
      sameTypeInstance(left.model, right.model))
  );
}

function sameTypeInstance(left: Entity, right: Entity): boolean {
  if (left === right) return true;
  if (left.entityKind !== "Type" || right.entityKind !== "Type") return false;
  if (
    left.kind !== right.kind ||
    !left.node ||
    left.node !== right.node ||
    unsafe_Realm.realmForType.get(left) === unsafe_Realm.realmForType.get(right)
  ) {
    return false;
  }
  const leftArgs = "templateMapper" in left ? left.templateMapper?.args : undefined;
  const rightArgs = "templateMapper" in right ? right.templateMapper?.args : undefined;
  if (!leftArgs || !rightArgs) return leftArgs === rightArgs;
  return (
    leftArgs.length === rightArgs.length &&
    leftArgs.every((arg, index) => sameTypeInstance(arg, rightArgs[index]))
  );
}
