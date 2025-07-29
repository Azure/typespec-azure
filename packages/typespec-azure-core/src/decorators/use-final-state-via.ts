import { ignoreDiagnostics } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import type { UseFinalStateViaDecorator } from "../../generated-defs/Azure.Core.js";
import { reportDiagnostic } from "../lib.js";
import { FinalStateValue } from "../lro-helpers.js";
import { setFinalStateOverride, validateFinalState } from "../state/final-state.js";

/**
 * overrides the final state for an lro
 * @param context The execution context for the decorator
 * @param entity The decorated operation
 * @param finalState The desired value for final-state-via
 */
export const $useFinalStateVia: UseFinalStateViaDecorator = (context, entity, finalState) => {
  const { program } = context;
  let finalStateVia: FinalStateValue;
  switch (finalState?.toLowerCase()) {
    case "original-uri":
      finalStateVia = FinalStateValue.originalUri;
      break;
    case "operation-location":
      finalStateVia = FinalStateValue.operationLocation;
      break;
    case "location":
      finalStateVia = FinalStateValue.location;
      break;
    case "azure-async-operation":
      finalStateVia = FinalStateValue.azureAsyncOperation;
      break;
    default:
      reportDiagnostic(program, {
        code: "invalid-final-state",
        target: entity,
        messageId: "badValue",
        format: { finalStateValue: finalState },
      });
      return;
  }

  const operation = ignoreDiagnostics(getHttpOperation(program, entity));
  const storedValue = validateFinalState(program, operation, finalStateVia);
  if (storedValue !== undefined || operation.verb === "put") {
    setFinalStateOverride(program, entity, finalStateVia);
  }
  if (
    storedValue === undefined &&
    [
      FinalStateValue.operationLocation,
      FinalStateValue.location,
      FinalStateValue.azureAsyncOperation,
    ].includes(finalStateVia)
  ) {
    reportDiagnostic(program, {
      code: "invalid-final-state",
      target: entity,
      messageId: "noHeader",
      format: { finalStateValue: finalStateVia },
    });
  }
};
