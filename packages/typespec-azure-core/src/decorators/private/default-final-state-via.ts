import { type Operation, type Program, ignoreDiagnostics } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { type DefaultFinalStateViaDecorator } from "../../../generated-defs/Azure.Core.Foundations.Private.js";
import { reportDiagnostic } from "../../lib.js";
import { FinalStateValue } from "../../lro-helpers.js";
import { setFinalStateOverride, validateFinalState } from "../../state/final-state.js";

export const $defaultFinalStateVia: DefaultFinalStateViaDecorator = (context, target, states) => {
  const { program } = context;
  const finalStateValues: FinalStateValue[] = [];
  for (const finalState of states as string[]) {
    switch (finalState?.toLowerCase()) {
      case "operation-location":
        finalStateValues.push(FinalStateValue.operationLocation);
        break;
      case "location":
        finalStateValues.push(FinalStateValue.location);
        break;
      case "azure-async-operation":
        finalStateValues.push(FinalStateValue.azureAsyncOperation);
        break;
      default:
        reportDiagnostic(program, {
          code: "invalid-final-state",
          target: target,
          messageId: "badValue",
          format: { finalStateValue: finalState },
        });
        return;
    }
  }
  const storedValue = validateFinalStates(program, target, finalStateValues);
  if (storedValue !== undefined) {
    setFinalStateOverride(program, target, storedValue);
  }
};

function validateFinalStates(
  program: Program,
  operation: Operation,
  finalStates: FinalStateValue[],
): FinalStateValue | undefined {
  const httpOp = ignoreDiagnostics(getHttpOperation(program, operation));
  for (const state of finalStates) {
    if (validateFinalState(program, httpOp, state)) return state;
  }

  return undefined;
}
