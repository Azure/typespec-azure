import type { Operation, Program } from "@typespec/compiler";
import { getRoutePath } from "@typespec/http";
import { isAutoRoute } from "@typespec/rest";
import type { NeedsRouteDecorator } from "../../../generated-defs/Azure.Core.Foundations.Private.js";
import { AzureCoreStateKeys, reportDiagnostic } from "../../lib.js";

export const $needsRoute: NeedsRouteDecorator = (context, entity) => {
  // If the operation is not templated, add it to the list of operations to
  // check later
  if (entity.node === undefined || entity.node.templateParameters.length === 0) {
    context.program.stateSet(AzureCoreStateKeys.needsRoute).add(entity);
  }
};

// TODO: migrate this to decorator post validation when/if become available
export function checkRpcRoutes(program: Program) {
  (program.stateSet(AzureCoreStateKeys.needsRoute) as Set<Operation>).forEach((op: Operation) => {
    if (
      op.node === undefined ||
      (op.node.templateParameters.length === 0 &&
        !isAutoRoute(program, op) &&
        !getRoutePath(program, op))
    ) {
      reportDiagnostic(program, {
        code: "rpc-operation-needs-route",
        target: op,
      });
    }
  });
}
