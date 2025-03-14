import { TCGCContext } from "../interfaces.js";
import { reportDiagnostic } from "../lib.js";

export function validateTypes(context: TCGCContext) {
  validateNoDiscriminatedUnions(context);
}

function validateNoDiscriminatedUnions(context: TCGCContext) {
  if (context.program.stateMap(Symbol.for("TypeSpec.discriminated"))) {
    for (const [type, _] of context.program.stateMap(Symbol.for("TypeSpec.discriminated"))) {
      reportDiagnostic(context.program, {
        code: "no-discriminated-unions",
        target: type,
      });
    }
  }
}
