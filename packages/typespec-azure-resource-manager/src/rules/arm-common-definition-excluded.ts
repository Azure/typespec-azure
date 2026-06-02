import { Model, ModelProperty, createRule, getNamespaceFullName, paramMessage } from "@typespec/compiler";
import { isArmCommonDefinitionExcluded } from "../private.decorators.js";

/**
 * Rule that prevents direct usage of ARM common types marked with @armCommonDefinitionExcluded
 * in service specifications outside the Azure.ResourceManager library.
 */
export const armCommonDefinitionExcludedRule = createRule({
  name: "arm-common-definition-excluded",
  severity: "warning",
  description:
    "Verify types marked as excluded from direct use in service specifications.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/arm-common-definition-excluded",
  messages: {
    default: paramMessage`The type '${"typeName"}' is an internal Azure Resource Manager common type and should not be used directly in service specifications. Use the equivalent type from Azure.ResourceManager.Foundations instead.`,
  },
  create(context) {
    return {
      modelProperty: (property: ModelProperty) => {
        const type = property.type;
        if (type.kind !== "Model") return;

        // Check if the property type is an excluded ARM common type
        if (!isArmCommonDefinitionExcluded(context.program, type as Model)) return;

        // Allow usage within Azure.ResourceManager namespace
        const containingNamespace = property.model?.namespace;
        if (
          containingNamespace &&
          getNamespaceFullName(containingNamespace).startsWith("Azure.ResourceManager")
        ) {
          return;
        }

        context.reportDiagnostic({
          format: { typeName: (type as Model).name },
          target: property,
        });
      },
    };
  },
});
