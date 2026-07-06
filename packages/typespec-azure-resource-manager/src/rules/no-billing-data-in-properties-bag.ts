import { Model, createRule, getProperty, paramMessage } from "@typespec/compiler";

import { getArmResource } from "../resource.js";
import { getProperties } from "./utils.js";

const restrictedPropertyName = "billingdata";

export const noBillingDataInPropertiesBagRule = createRule({
  name: "no-billing-data-in-properties-bag",
  description:
    "A property named 'BillingData' must not be present in a resource's property bag. The name is reserved for platform billing integration.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/no-billing-data-in-properties-bag",
  messages: {
    default: paramMessage`Property "${"propertyName"}" is not allowed in the resource property bag. The "BillingData" property name is reserved for platform billing integration.`,
  },
  create(context) {
    return {
      model: (model: Model) => {
        const resourceModel = getArmResource(context.program, model);
        if (resourceModel === undefined) {
          return;
        }

        const resourceProperties = getProperty(model, "properties")?.type;
        if (resourceProperties === undefined || resourceProperties.kind !== "Model") {
          return;
        }

        for (const property of getProperties(resourceProperties)) {
          if (property.name.toLowerCase() === restrictedPropertyName) {
            context.reportDiagnostic({
              format: { propertyName: property.name },
              target: property,
            });
          }
        }
      },
    };
  },
});
