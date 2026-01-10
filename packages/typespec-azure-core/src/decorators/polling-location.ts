import {
  createDiagnosticCollector,
  Diagnostic,
  getEffectiveModelType,
  ignoreDiagnostics,
  isNeverType,
  isUnknownType,
  isVoidType,
  type DecoratorContext,
  type IntrinsicType,
  type Model,
  type ModelProperty,
  type Program,
  type Type,
} from "@typespec/compiler";
import { $ } from "@typespec/compiler/typekit";
import { useStateMap, useStateSet } from "@typespec/compiler/utils";
import { isMetadata } from "@typespec/http";
import type { PollingLocationDecorator } from "../../generated-defs/Azure.Core.js";
import { AzureCoreStateKeys } from "../lib.js";
import { ModelPropertyTerminationStatus } from "../lro-helpers.js";
import { getLroErrorResult } from "./lro-error-result.js";
import { getLroResult } from "./lro-result.js";
import {
  extractLroStates,
  findLroStatusProperty,
  getLongRunningStates,
  LongRunningStates,
} from "./lro-status.js";

export const [
  /**
   * Gets polling information stored with a field that contains a link to an Lro polling endpoint
   * @param program The program to check
   * @param target The ModelProperty to check for polling info
   */
  getPollingLocationInfo,
  setPollingLocationInfo,
] = useStateMap<ModelProperty, PollingLocationInfo>(AzureCoreStateKeys.pollingLocationInfo);

export const [isPollingLocation, setPollingLocationParameter] = useStateSet<ModelProperty>(
  AzureCoreStateKeys.pollingLocationInfo,
);

/** Extra information about polling control stored with a polling link */
export type PollingLocationInfo = StatusMonitorPollingLocationInfo;

/** The abstract type for polling control information */
export interface PollingLocationBase {
  /** The kind of polling being done */
  kind: pollingOptionsKind;
  /** The model property containing the polling link */
  target: ModelProperty;
  /** The type of the poller */
  pollingModel?: Model | IntrinsicType;
  /** The type of the final result after polling completes */
  finalResult?: Model | IntrinsicType;
}

/** Collected data for status monitor polling links */
export interface StatusMonitorPollingLocationInfo extends PollingLocationBase {
  /** The kind of status monitor */
  kind: pollingOptionsKind.StatusMonitor;
  /** The status monitor detailed data for control of polling. */
  info: StatusMonitorMetadata;
}

/** Metadata for the StatusMonitor */
export interface StatusMonitorMetadata {
  /** The model type of the status monitor */
  monitorType: Model;
  /** Information on polling status property and termina states */
  terminationInfo: ModelPropertyTerminationStatus;

  lroStates: LongRunningStates;

  /** The property containing the response when polling terminates with success */
  successProperty?: ModelProperty;

  /** The property containing error information when polling terminates with failure */
  errorProperty?: ModelProperty;

  statusProperty: ModelProperty;

  successType: Model | IntrinsicType;

  errorType?: Model;
}

// keys of the pollingOptions type
const optionsKindKey = "kind";
const finalPropertyKey = "finalProperty";
const pollingModelKey = "pollingModel";
const finalResultKey = "finalResult";

export enum pollingOptionsKind {
  StatusMonitor = "statusMonitor",
}
export const $pollingLocation: PollingLocationDecorator = (
  context: DecoratorContext,
  entity: ModelProperty,
  options?: Type,
) => {
  const { program } = context;
  if (options) {
    if (isNeverType(options)) return;
    const info = extractPollingLocationInfo(program, entity, options);
    if (info) {
      setPollingLocationInfo(program, entity, info);
    }
  }

  setPollingLocationParameter(program, entity);
};

function extractUnionVariantValue(type: Type): string | undefined {
  if (type.kind === "UnionVariant" && type.type.kind === "String") return type.type.value;
  return undefined;
}

function extractPollingLocationInfo(
  program: Program,
  target: ModelProperty,
  options: Type,
): PollingLocationInfo | undefined {
  if (options.kind !== "Model") return undefined;
  const kind = options.properties.get(optionsKindKey);
  if (kind === undefined) return undefined;
  const kindValue: string | undefined = extractUnionVariantValue(kind.type);
  if (kindValue === undefined) return undefined;
  const pollingInfo: {
    pollingModel?: Model | IntrinsicType;
    finalResult?: Model | IntrinsicType;
    target: ModelProperty;
    useForFinalState?: boolean;
  } = { target: target };
  const pollingModel = options.properties.get(pollingModelKey)?.type;
  if (pollingModel && pollingModel.kind === "Model") pollingInfo.pollingModel = pollingModel;
  if (pollingModel && isVoidType(pollingModel))
    pollingInfo.pollingModel = $(program).intrinsic.void;
  const finalResult = options.properties.get(finalResultKey)?.type;
  if (finalResult && finalResult.kind === "Model") pollingInfo.finalResult = finalResult;
  if (finalResult && isVoidType(finalResult)) pollingInfo.finalResult = $(program).intrinsic.void;
  switch (kindValue) {
    case pollingOptionsKind.StatusMonitor:
      return extractStatusMonitorLocationInfo(program, options, pollingInfo);
    default:
      return undefined;
  }
}

function extractStatusMonitorLocationInfo(
  program: Program,
  options: Model,
  baseInfo: {
    pollingModel?: Model | IntrinsicType;
    finalResult?: Model | IntrinsicType;
    target: ModelProperty;
    useForFInalState?: boolean;
  },
): StatusMonitorPollingLocationInfo | undefined {
  const kind = options.properties.get(optionsKindKey);
  if (kind === undefined || extractUnionVariantValue(kind.type) !== "statusMonitor")
    return undefined;
  if (baseInfo.pollingModel === undefined || baseInfo.pollingModel.kind === "Intrinsic")
    return undefined;
  const finalProperty = options.properties.get(finalPropertyKey)?.type;
  let finalPropertyValue: ModelProperty | undefined = undefined;
  if (finalProperty && finalProperty.kind === "ModelProperty") finalPropertyValue = finalProperty;
  if (
    finalProperty &&
    finalProperty.kind === "String" &&
    baseInfo.pollingModel.properties.has(finalProperty.value)
  ) {
    finalPropertyValue = baseInfo.pollingModel.properties.get(finalProperty.value);
  }
  if (finalPropertyValue === undefined)
    finalPropertyValue = ignoreDiagnostics(getLroResult(program, baseInfo.pollingModel, true));
  const statusProperty = findLroStatusProperty(program, baseInfo.pollingModel);
  if (statusProperty === undefined) return undefined;
  const statusMonitor = ignoreDiagnostics(
    extractStatusMonitorInfo(program, baseInfo.pollingModel, statusProperty),
  );
  if (statusMonitor === undefined) return undefined;
  statusMonitor.successProperty = finalPropertyValue;
  baseInfo.finalResult =
    finalPropertyValue?.type?.kind === "Model" || finalPropertyValue?.type?.kind === "Intrinsic"
      ? finalPropertyValue.type
      : $(program).intrinsic.void;
  return {
    kind: pollingOptionsKind.StatusMonitor,
    info: statusMonitor,
    ...baseInfo,
  };
}

export function extractStatusMonitorInfo(
  program: Program,
  model: Model,
  statusProperty: ModelProperty,
): [StatusMonitorMetadata | undefined, readonly Diagnostic[]] {
  const diagnosticsToToss = createDiagnosticCollector();
  const diagnosticsToKeep = createDiagnosticCollector();
  const lroResult = diagnosticsToKeep.pipe(getLroResult(program, model, true));
  const successProperty: ModelProperty | undefined =
    lroResult?.kind === "ModelProperty" ? lroResult : undefined;
  const errorProperty: ModelProperty | undefined = diagnosticsToKeep.pipe(
    getLroErrorResult(program, model, true),
  );
  const states: LongRunningStates | undefined =
    getLongRunningStates(program, statusProperty) ??
    diagnosticsToToss.pipe(extractLroStates(program, statusProperty));
  if (!states || !statusProperty) return diagnosticsToKeep.wrap(undefined);
  return diagnosticsToKeep.wrap({
    monitorType: getEffectiveModelType(program, model, (p) => !isMetadata(program, p)) ?? model,
    successProperty: successProperty,
    errorProperty: errorProperty,
    statusProperty: statusProperty,
    lroStates: states,
    errorType: errorProperty?.type.kind === "Model" ? errorProperty.type : undefined,
    successType:
      (successProperty?.type && isUnknownType(successProperty.type)) ||
      successProperty?.type?.kind === "Model"
        ? successProperty.type
        : $(program).intrinsic.void,
    terminationInfo: {
      kind: "model-property",
      property: statusProperty,
      canceledState: states.canceledState,
      failedState: states.failedState,
      succeededState: states.succeededState,
    },
  });
}
