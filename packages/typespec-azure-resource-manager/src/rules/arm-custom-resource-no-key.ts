import { createRule, isKey, Model } from "@typespec/compiler";
import { isCustomAzureResource } from "../resource.js";
import { getProperties } from "./utils.js";

export const armCustomResourceNoKey = createRule({
  name: "arm-custom-resource-no-key",
  description: "Validate that custom resource contains a key property.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/arm-custom-resource-no-key",
  messages: {
    default: `Custom Azure resource models must define a key property using the @key decorator. Without a key, operation paths could be duplicated.`,
  },
  create(context) {
    return {
      model: (model: Model) => {
        if (isCustomAzureResource(context.program, model)) {
          const hasKeyProperty = getProperties(model).some((property) =>
            isKey(context.program, property),
          );
          if (!hasKeyProperty) {
            context.reportDiagnostic({
              code: "arm-custom-resource-no-key",
              target: model,
            });
          }
        }
      },
    };
  },
});
