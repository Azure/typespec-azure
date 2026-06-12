import { Model, ModelProperty, createRule, getNamespaceFullName, paramMessage } from "@typespec/compiler";
import { getArmCommonDefinitionExcluded } from "../private.decorators.js";

/**
 * Rule that prevents direct usage of deprecated ARM common types
 * in service specifications outside the Azure.ResourceManager library.
 */
export const noDeprecatedCommonTypesRule = createRule({
  name: "no-deprecated-common-types",
  severity: "warning",
  description:
    "Verify deprecated common types are not used directly in service specifications.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/no-deprecated-common-types",
  messages: {
    default: paramMessage`The type '${"typeName"}' is an internal Azure Resource Manager common type and should not be used directly in service specifications. Use the type '${"replacementType"}' instead.`,
  },
  create(context) {
    return {
      modelProperty: (property: ModelProperty) => {
        const type = property.type;
        if (type.kind !== "Model") return;

        // Check if the property type is a deprecated ARM common type
        const replacementType = getArmCommonDefinitionExcluded(context.program, type as Model);
        if (!replacementType) return;

        // Allow usage within Azure.ResourceManager namespace
        const containingNamespace = property.model?.namespace;
        if (
          containingNamespace &&
          getNamespaceFullName(containingNamespace).startsWith("Azure.ResourceManager")
        ) {
          return;
        }

        context.reportDiagnostic({
          format: { typeName: (type as Model).name, replacementType },
          target: property,
        });
      },
    };
  },
});
