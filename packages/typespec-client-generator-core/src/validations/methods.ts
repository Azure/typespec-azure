import { getClientNameOverride } from "../decorators.js";
import { TCGCContext } from "../interfaces.js";
import {
  clientLocationKey,
  hasExplicitClient,
  listScopedDecoratorData,
  overrideKey,
} from "../internal-utils.js";
import { reportDiagnostic } from "../lib.js";

export function validateMethods(context: TCGCContext) {
  validateNoClientLocationWithClient(context);
  validateClientNameNotOnOverriddenMethods(context);
}

function validateNoClientLocationWithClient(context: TCGCContext) {
  if (context.program.stateMap(clientLocationKey) && hasExplicitClient(context)) {
    for (const [op, _] of context.program.stateMap(clientLocationKey)) {
      reportDiagnostic(context.program, {
        code: "client-location-conflict",
        target: op,
      });
    }
  }
}

function validateClientNameNotOnOverriddenMethods(context: TCGCContext) {
  for (const [original, override] of listScopedDecoratorData(context, overrideKey)) {
    const clientNameOverride = getClientNameOverride(context, override);
    if (clientNameOverride) {
      reportDiagnostic(context.program, {
        code: "client-name-ineffective",
        messageId: "override",
        target: override,
        format: {
          name: clientNameOverride,
          originalMethodName: original.kind === "Operation" ? original.name : "<unknown>",
        },
      });
    }
  }
}
