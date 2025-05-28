import { TCGCContext } from "../interfaces.js";
import { hasExplicitClientOrOperationGroup, moveToKey } from "../internal-utils.js";
import { reportDiagnostic } from "../lib.js";

export function validateMethods(context: TCGCContext) {
  validateNoMoveToWithClientOrOperationGroup(context);
}

function validateNoMoveToWithClientOrOperationGroup(context: TCGCContext) {
  if (context.program.stateMap(moveToKey) && hasExplicitClientOrOperationGroup(context)) {
    for (const [op, _] of context.program.stateMap(moveToKey)) {
      reportDiagnostic(context.program, {
        code: "no-move-to-with-client-or-operation-group",
        target: op,
      });
    }
  }
}
