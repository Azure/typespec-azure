import {
  DiagnosticMessages,
  LinterRuleContext,
  Model,
  Operation,
  createRule,
  getEffectiveModelType,
  isErrorType,
  isType,
} from "@typespec/compiler";

import { ArmLifecycleOperationKind, resolveResourceOperations } from "../operations.js";
import { getArmResource } from "../resource.js";
import { isInternalTypeSpec } from "./utils.js";

export const armResourceOperationsRule = createRule({
  name: "arm-resource-operation-response",
  severity: "warning",
  description: "[RPC 008]: PUT, GET, PATCH & LIST must return the same resource schema.",
  messages: {
    default: "[RPC 008]: PUT, GET, PATCH & LIST must return the same resource schema.",
  },
  create(context) {
    return {
      model: (model: Model) => {
        if (!isInternalTypeSpec(context.program, model)) {
          const armResource = getArmResource(context.program, model);
          if (armResource) {
            const resourceOperations = resolveResourceOperations(context.program, model);
            const kinds: ArmLifecycleOperationKind[] = ["read", "createOrUpdate", "update"];
            kinds
              .map((k) => resourceOperations.lifecycle[k])
              .forEach(
                (op) => op && checkArmResourceOperationReturnType(context, model, op.operation),
              );
            const lists = resourceOperations.lists;
            for (const key in lists) {
              checkArmResourceOperationReturnType(context, model, lists[key].operation);
            }
          }
        }
      },
    };
  },
});

function checkArmResourceOperationReturnType(
  context: LinterRuleContext<DiagnosticMessages>,
  model: Model,
  operation: Operation,
) {
  if (!isInternalTypeSpec(context.program, operation)) {
    const returnType = operation.returnType;
    if (returnType.kind === "Model") {
      throwIfNotMatchingArmModel(context, operation, model, returnType);
    } else if (returnType.kind === "Union") {
      for (const variant of returnType.variants.values()) {
        if (!isErrorType(variant.type) && variant.type.kind === "Model") {
          const modelCandidate = getEffectiveModelType(context.program, variant.type);
          throwIfNotMatchingArmModel(context, operation, model, modelCandidate);
          if (modelCandidate.templateMapper !== undefined) {
            // ArmResponse<FooResource>
            for (const arg of modelCandidate.templateMapper.args) {
              if (isType(arg) && arg.kind === "Model") {
                throwIfNotMatchingArmModel(context, operation, model, arg);
                if (arg.templateMapper !== undefined) {
                  const modelArgs = arg.templateMapper.args.filter(
                    (a) => isType(a) && a.kind === "Model",
                  );
                  const resourceArgs = modelArgs.filter(
                    (a) => getArmResource(context.program, a) !== undefined,
                  );
                  // if there is only one ARM resource argument, it must match the expected ARM resource
                  if (resourceArgs.length === 1) {
                    throwIfNotMatchingArmModel(context, operation, model, resourceArgs[0]);
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  function throwIfNotMatchingArmModel(
    context: LinterRuleContext<DiagnosticMessages>,
    operation: Operation,
    model: Model,
    modelCandidate: Model,
  ) {
    if (getArmResource(context.program, modelCandidate) !== undefined && modelCandidate !== model) {
      context.reportDiagnostic({
        target: operation,
      });
    }
  }
}
