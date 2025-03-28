import { TCGCContext } from "../interfaces.js";
import { reportDiagnostic } from "../lib.js";

export function validatePackage(context: TCGCContext) {
  validateOnlyOneService(context);
}

function validateOnlyOneService(context: TCGCContext) {
  if (context.program.stateMap(Symbol.for("@typespec/compiler.services"))) {
    let serviceCount = 0;
    for (const [type, _] of context.program.stateMap(Symbol.for("@typespec/compiler.services"))) {
      serviceCount++;
      if (serviceCount > 1) {
        reportDiagnostic(context.program, {
          code: "service-more-than-one",
          target: type,
        });
      }
    }
  }
}
