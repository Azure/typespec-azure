import {
  type DiagnosticMessages,
  type LinterRuleContext,
  type Model,
  type Operation,
  type Program,
  type Type,
  createRule,
  fileRef,
  getEffectiveModelType,
  getProperty,
  isArrayModelType,
  isErrorType,
  isType,
} from "@typespec/compiler";

import { type ArmLifecycleOperationKind, resolveResourceOperations } from "../operations.js";
import { getArmResource, resolveArmResources } from "../resource.js";
import { isInternalTypeSpec } from "./utils.js";

export const armResourceOperationsRule = createRule({
  name: "arm-resource-operation-response",
  docs: fileRef.fromPackageRoot("src/rules/arm-resource-operation-response.md"),
  severity: "warning",
  description: "[RPC 008]: PUT, GET, PATCH & LIST must return the same resource schema.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/arm-resource-operation-response",
  messages: {
    default: "[RPC 008]: PUT, GET, PATCH & LIST must return the same resource schema.",
  },
  create(context) {
    const reported = new Set<Operation>();
    return {
      root(program) {
        for (const resource of resolveArmResources(program).resources ?? []) {
          for (const { operation, httpOperation } of resource.operations.lists ?? []) {
            if (isInternalTypeSpec(program, operation)) continue;
            const response =
              httpOperation.responses.find((response) => response.statusCodes === 200) ??
              httpOperation.responses.find((response) => response.statusCodes === 201);
            if (!response) continue;

            const invalid = response.responses.some(({ body }) => {
              return (
                !body ||
                body.bodyKind !== "single" ||
                !isResourceListBody(program, body.type, resource.type)
              );
            });
            if (invalid && !reported.has(operation)) {
              reported.add(operation);
              context.reportDiagnostic({ target: operation });
            }
          }
        }
      },
      model: (model: Model) => {
        if (!isInternalTypeSpec(context.program, model)) {
          const armResource = getArmResource(context.program, model);
          if (armResource) {
            const resourceOperations = resolveResourceOperations(context.program, model);
            const kinds: ArmLifecycleOperationKind[] = ["read", "createOrUpdate", "update"];
            kinds
              .map((k) => resourceOperations.lifecycle[k])
              .forEach(
                (op) =>
                  op && checkArmResourceOperationReturnType(context, model, op.operation, reported),
              );
            const lists = resourceOperations.lists;
            for (const key in lists) {
              checkArmResourceOperationReturnType(context, model, lists[key].operation, reported);
            }
          }
        }
      },
    };
  },
});

function isResourceListBody(program: Program, body: Type, resource: Model): boolean {
  if (body.kind === "Union") {
    return [...body.variants.values()].every((variant) =>
      isResourceListBody(program, variant.type, resource),
    );
  }
  if (body.kind !== "Model") return false;
  const value = getProperty(body, "value")?.type;
  if (value?.kind !== "Model" || !isArrayModelType(value)) return false;
  const item = value.indexer.value;
  return item.kind === "Model" && getEffectiveModelType(program, item) === resource;
}

function checkArmResourceOperationReturnType(
  context: LinterRuleContext<DiagnosticMessages>,
  model: Model,
  operation: Operation,
  reported: Set<Operation>,
) {
  if (!isInternalTypeSpec(context.program, operation) && !reported.has(operation)) {
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
      if (!reported.has(operation)) {
        reported.add(operation);
        context.reportDiagnostic({ target: operation });
      }
    }
  }
}
