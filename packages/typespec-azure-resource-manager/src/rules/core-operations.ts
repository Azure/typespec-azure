import {
  Model,
  ModelProperty,
  Operation,
  Program,
  createRule,
  paramMessage,
} from "@typespec/compiler";
import { SyntaxKind } from "@typespec/compiler/ast";
import { HttpVerb, getOperationVerb } from "@typespec/http";
import {
  getNamespaceName,
  getSourceModel,
  isInternalTypeSpec,
  isSourceOperationResourceManagerInternal,
  isTemplatedInterfaceOperation,
} from "./utils.js";

export const coreOperationsRule = createRule({
  name: "arm-resource-operation",
  severity: "warning",
  description: "Validate ARM Resource operations.",
  messages: {
    default:
      "All Resource operations must use an api-version parameter. Please include Azure.ResourceManager.ApiVersionParameter in the operation parameter list using the spread (...ApiVersionParameter) operator, or using one of the common resource parameter models.",
    opOutsideInterface: "All operations must be inside an interface declaration.",
    opMissingDecorator: paramMessage`Resource ${"verb"} operation must be decorated with ${"decorator"}.`,
  },
  create(context) {
    return {
      operation: (operation: Operation) => {
        if (
          !isInternalTypeSpec(context.program, operation) &&
          !isSourceOperationResourceManagerInternal(operation) &&
          !isArmProviderActionOperation(operation)
        ) {
          const verb = getOperationVerb(context.program, operation);
          if (
            !isTemplatedInterfaceOperation(operation) &&
            (!operation.node.parent || operation.node.parent.kind !== SyntaxKind.InterfaceStatement)
          ) {
            context.reportDiagnostic({
              messageId: "opOutsideInterface",
              target: operation,
            });
          }
          const parameters: Model = operation.parameters;
          if (
            parameters === undefined ||
            parameters === null ||
            !hasApiParameter(context.program, parameters)
          ) {
            context.reportDiagnostic({
              target: operation,
            });
          }
          if (verb) {
            const requiredDecorators = resourceOperationDecorators[verb];
            if (requiredDecorators?.length > 0) {
              const decorator = operation.decorators.find(
                (d) => requiredDecorators.indexOf(d.decorator.name) >= 0,
              );
              if (!decorator) {
                context.reportDiagnostic({
                  messageId: "opMissingDecorator",
                  target: operation,
                  format: {
                    verb: verb.toUpperCase(),
                    decorator: requiredDecorators.map((d) => `@${d.substring(1)}`).join(" or "),
                  },
                });
              }
            }
          }
        }
      },
    };
  },
});

const resourceOperationDecorators: { [verb in HttpVerb]: string[] } = {
  put: ["$armResourceCreateOrUpdate"],
  get: ["$armResourceRead", "$armResourceList"],
  patch: ["$armResourceUpdate"],
  delete: ["$armResourceDelete"],
  post: ["$armResourceAction", "$armResourceCollectionAction"],
  head: [],
};

function isApiParameter(program: Program, property: ModelProperty): boolean {
  if (property.type.kind !== "Scalar") return false;
  if (!property.sourceProperty) return false;
  const sourceModel: Model | undefined = getSourceModel(property.sourceProperty);
  if (sourceModel === undefined) return false;
  return (
    sourceModel.name === "ApiVersionParameter" &&
    getNamespaceName(program, sourceModel) === "Azure.ResourceManager.CommonTypes"
  );
}

function hasApiParameter(program: Program, model: Model): boolean {
  if (model.properties === undefined || model.properties.size === 0) return false;
  const apiVersionParams: ModelProperty[] = [...model.properties.values()].filter((i) =>
    isApiParameter(program, i),
  );
  return apiVersionParams !== null && apiVersionParams.length === 1;
}

function isArmProviderActionOperation(operation: Operation): boolean {
  const providerActionOperations = ["ArmProviderActionAsync", "ArmProviderActionSync"];
  while (operation.sourceOperation) {
    if (providerActionOperations.includes(operation.sourceOperation.name)) {
      return true;
    }
    operation = operation.sourceOperation;
  }

  return false;
}
