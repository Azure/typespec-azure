import { Operation, createRule } from "@typespec/compiler";
import { getRoutePath } from "@typespec/http";
import { isResourceOperation } from "../decorators/private/ensure-resource-type.js";
import { isExcludedCoreType } from "./utils.js";

export const noExplicitRoutesResourceOps = createRule({
  name: "no-explicit-routes-resource-ops",
  description: "The @route decorator should not be used on standard resource operation signatures.",
  severity: "warning",
  messages: {
    default:
      "The @route decorator should not be used on standard resource operation signatures. If you are trying to add a route prefix to an operation use the @route decorator on an interface or namespace instead.",
  },
  create(context) {
    return {
      operation: (operation: Operation) => {
        if (
          isExcludedCoreType(context.program, operation) ||
          !isResourceOperation(context.program, operation)
        ) {
          return;
        }

        if (getRoutePath(context.program, operation)) {
          context.reportDiagnostic({
            target: operation,
          });
        }
      },
    };
  },
});
