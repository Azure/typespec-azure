import { Model, createRule, getProperty, paramMessage } from "@typespec/compiler";

import { getArmResource } from "../resource.js";
import { getProperties } from "./utils.js";

/**
 * Property names that are reserved and must not appear in a resource's property bag, written with
 * their canonical casing and mapped to the reason each name is reserved. Names are matched
 * case-insensitively. Add a new entry here to reserve an additional resource property name.
 */
const reservedProperties = new Map<string, string>([
  ["billingData", "platform billing integration"],
]);

/**
 * Case-insensitive lookup keyed by the lowercased reserved name. Both the reserved names and the
 * resource property names are lowercased when compared, while diagnostics report the reserved name
 * with its canonical casing.
 */
const reservedPropertiesByLowerName = new Map(
  [...reservedProperties].map(([name, reason]) => [name.toLowerCase(), { name, reason }]),
);

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
          const reserved = reservedPropertiesByLowerName.get(property.name.toLowerCase());
          if (reserved !== undefined) {
            context.reportDiagnostic({
              format: { propertyName: reserved.name, reason: reserved.reason },
              target: property,
            });
          }
        }
      },
    };
  },
});
