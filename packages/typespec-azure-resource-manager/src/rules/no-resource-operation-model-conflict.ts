import {
  createRule,
  fileRef,
  getTypeName,
  isTemplateDeclarationOrInstance,
  paramMessage,
} from "@typespec/compiler";
import { getOriginalResourceOperationModels } from "../operations.js";
import { isInternalTypeSpec, isTemplatedInterfaceOperation } from "./utils.js";

export const noResourceOperationModelConflictRule = createRule({
  name: "no-resource-operation-model-conflict",
  description:
    "Prevent one resource operation from being registered against different resource models.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/no-resource-operation-model-conflict",
  docs: fileRef.fromPackageRoot("src/rules/no-resource-operation-model-conflict.md"),
  messages: {
    default: paramMessage`Resource operation is registered against multiple resource models: ${"models"}. Use the same resource model for every registration.`,
  },
  create(context) {
    const modelsByOperation = getOriginalResourceOperationModels(context.program);
    return {
      operation(operation) {
        if (
          isTemplateDeclarationOrInstance(operation) ||
          isTemplatedInterfaceOperation(operation) ||
          isInternalTypeSpec(context.program, operation)
        )
          return;
        const models = modelsByOperation.get(operation);
        if (models !== undefined && models.size > 1) {
          context.reportDiagnostic({
            target: operation,
            format: {
              models: [...models]
                .map((model) => getTypeName(model))
                .sort()
                .join(", "),
            },
          });
        }
      },
    };
  },
});
