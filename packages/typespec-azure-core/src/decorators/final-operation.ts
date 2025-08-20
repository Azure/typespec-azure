import type { DecoratorContext, Operation, Type } from "@typespec/compiler";
import type { FinalOperationDecorator } from "../../generated-defs/Azure.Core.js";
import { reportDiagnostic } from "../lib.js";
import { $operationLink, getOperationLink } from "./operation-link.js";

export const FinalOperationKey = "final";

export const $finalOperation: FinalOperationDecorator = (
  context: DecoratorContext,
  entity: Operation,
  linkedOperation: Operation,
  parameters?: Type,
) => {
  const { program } = context;
  context.call($operationLink, entity, linkedOperation, FinalOperationKey, parameters);

  const operationDetails = getOperationLink(program, entity, FinalOperationKey);
  if (operationDetails === undefined || operationDetails.result === undefined) {
    reportDiagnostic(context.program, {
      code: "invalid-final-operation",
      target: entity,
    });
  }
};
