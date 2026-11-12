import {
  createRule,
  fileRef,
  getTypeName,
  isTemplateDeclarationOrInstance,
  paramMessage,
} from "@typespec/compiler";
import { getArmResourceOperationData, getOriginalResourceOperationModels } from "../operations.js";
import { isInternalTypeSpec, isTemplatedInterfaceOperation } from "./utils.js";

export const noResourceOperationConflictRule = createRule({
  name: "no-resource-operation-conflict",
  description:
    "Prevent one resource operation from being registered with different resource models or operation kinds.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/no-resource-operation-conflict",
  docs: fileRef.fromPackageRoot("src/rules/no-resource-operation-conflict.md"),
  messages: {
    default: paramMessage`Resource operation is registered against multiple resource models: ${"models"}. Use the same resource model for every registration.`,
    kind: "Resource operation is registered with different operation kinds. Use one ARM operation kind consistently; @get and @list can be applied to resource actions without @armResourceList.",
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
        if (
          models !== undefined &&
          getArmResourceOperationData(context.program, operation)?.hasKindConflict
        ) {
          context.reportDiagnostic({ target: operation, messageId: "kind" });
        }
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
