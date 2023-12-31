import { Model, createRule, getProperty } from "@typespec/compiler";

import { getArmResources } from "../resource.js";
import { getProperties } from "./utils.js";

/**
 * verify the 'identity' property should be present in the update resource properties.
 */
export const envelopePropertiesRules = createRule({
  name: "empty-updateable-properties",
  severity: "warning",
  description: "Should have updateable properties.",
  messages: {
    default: `The RP-specific properties of the Resource (as defined in the 'properties' property) should have at least one updateable property.  Properties are updateable if they do not have a '@visibility' decorator, or if they include 'update' in the '@visibility' decorator arguments.`,
  },
  create(context) {
    return {
      model: (model: Model) => {
        const resources = getArmResources(context.program);
        const armResource = resources.find((re) => re.typespecType === model);

        if (
          armResource &&
          armResource.operations.lifecycle.update &&
          armResource.operations.lifecycle.createOrUpdate
        ) {
          const updateOperationProperties =
            armResource.operations.lifecycle.update.httpOperation.parameters.body?.type;
          if (updateOperationProperties?.kind === "Model") {
            if (getProperties(updateOperationProperties).length < 1) {
              context.reportDiagnostic({
                target: model,
              });
            }
            const updateablePropertiesBag = getProperty(updateOperationProperties, "properties");
            if (
              updateablePropertiesBag?.type.kind === "Model" &&
              getProperties(updateablePropertiesBag.type).length === 0
            ) {
              context.reportDiagnostic({
                target: model.properties.get("properties")?.type ?? model,
              });
            }
          }
        }
      },
    };
  },
});
