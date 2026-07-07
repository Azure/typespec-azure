import { Model, createRule, getProperty, paramMessage } from "@typespec/compiler";

import { getArmResource } from "../resource.js";
import { getProperties } from "./utils.js";

/**
 * Property names that are reserved and must not appear in a resource's property bag, mapped to
 * the reason each name is reserved. Names are compared case-insensitively, so keys must be
 * lowercase. Add a new entry here to reserve an additional resource property name.
 */
const reservedProperties = new Map<string, string>([
  ["billingData", "platform billing integration"],
]);

export const noReservedResourcePropertyRule = createRule({
  name: "no-reserved-resource-property",
  description:
    "Reserved property names (for example 'billingData') must not be present in a resource's property bag. The property name is matched case-insensitively.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/no-reserved-resource-property",
  messages: {
    default: paramMessage`Property "${"propertyName"}" is not allowed in the resource property bag. This property name is reserved for ${"reason"}.`,
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
          const reason = reservedProperties.get(property.name.toLowerCase());
          if (reason !== undefined) {
            context.reportDiagnostic({
              format: { propertyName: property.name, reason },
              target: property,
            });
          }
        }
      },
    };
  },
});
