import {
  Model,
  ModelProperty,
  Operation,
  Program,
  createRule,
  isTemplateInstance,
} from "@typespec/compiler";
import {
  getNamespaceName,
  getSourceModel,
  isSourceOperationResourceManagerInternal,
  isTemplatedInterfaceOperation,
} from "./utils.js";

export const armResourceOperationMissingApiVersionRule = createRule({
  name: "arm-resource-operation-missing-api-version",
  severity: "warning",
  description:
    "Validate ARM Resource operations include the api-version parameter referencing Azure.ResourceManager.CommonTypes.ApiVersionParameter.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/arm-resource-operation-missing-api-version",
  messages: {
    default:
      "All Resource operations must use an api-version parameter. Please include Azure.ResourceManager.ApiVersionParameter in the operation parameter list using the spread (...ApiVersionParameter) operator, or using one of the common resource parameter models.",
  },
  create(context) {
    return {
      operation: (operation: Operation) => {
        if (
          !isSourceOperationResourceManagerInternal(operation) &&
          !isTemplateInstance(operation) &&
          !isTemplatedInterfaceOperation(operation)
        ) {
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
        }
      },
    };
  },
});

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
