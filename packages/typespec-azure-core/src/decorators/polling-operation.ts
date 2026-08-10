import type { DecoratorContext, Operation, Type } from "@typespec/compiler";
import type { PollingOperationDecorator } from "../../generated-defs/Azure.Core.js";
import { reportDiagnostic } from "../lib.js";
import { $operationLink, getOperationLink } from "./operation-link.js";

/*
 * Constants for polling and final operation links
 */

export const PollingOperationKey: string = "polling";

export const $pollingOperation: PollingOperationDecorator = (
  context: DecoratorContext,
  target: Operation,
  linkedOperation: Operation,
  parameters?: Type,
) => {
  const { program } = context;
  const isValidReturnType =
    target.returnType.kind === "Model" ||
    (target.returnType.kind === "Union" &&
      [...target.returnType.variants.values()].every((x) => x.type.kind === "Model"));
  if (!isValidReturnType) {
    reportDiagnostic(context.program, {
      code: "polling-operation-return-model",
      target: target,
    });
    return;
  }
  context.call($operationLink, target, linkedOperation, PollingOperationKey, parameters);

  const operationDetails = getOperationLink(program, target, PollingOperationKey);
  if (operationDetails === undefined || operationDetails.result === undefined) {
    reportDiagnostic(context.program, {
      code: "polling-operation-return-model",
      target: target,
    });
    return;
  }

  if (operationDetails.result.statusMonitor === undefined) {
    reportDiagnostic(context.program, {
      code: "polling-operation-no-status-monitor",
      target: linkedOperation,
    });
    return;
  }

  if (operationDetails.result.statusMonitor.terminationInfo.succeededState.length < 1) {
    reportDiagnostic(context.program, {
      code: "polling-operation-no-lro-success",
      target: operationDetails.result.statusMonitor.monitorType,
    });
  }

  if (operationDetails.result.statusMonitor.terminationInfo.failedState.length < 1) {
    reportDiagnostic(context.program, {
      code: "polling-operation-no-lro-failure",
      target: operationDetails.result.statusMonitor.monitorType,
    });
  }

  if (operationDetails.parameterMap === undefined && operationDetails.link === undefined) {
    reportDiagnostic(context.program, {
      code: "polling-operation-no-ref-or-link",
      target: target,
    });
  }
};
