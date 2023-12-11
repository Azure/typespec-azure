import { Enum, Model, createRule, getProperty, paramMessage } from "@typespec/compiler";

import { getArmResource } from "../resource.js";
import { getSourceProperty } from "./utils.js";

export const armResourceProvisioningStateRule = createRule({
  name: "arm-resource-provisioning-state",
  severity: "warning",
  description: "Check for properly configured provisioningState property.",
  messages: {
    default:
      "The RP-specific property model in the 'properties' property of this resource must contain a 'provisioningState property.  The property type should be an enum, and it must specify known state values 'Succeeded', 'Failed', and 'Canceled'.",
    missingValues: paramMessage`The "@knownValues" decorator for provisioningState, must reference an enum with 'Succeeded', 'Failed', 'Canceled' values. The enum is missing the values: [${"missingValues"}].`,
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

        let provisioning = getProperty(resourceProperties, "provisioningState");
        if (provisioning === undefined) {
          context.reportDiagnostic({
            target: resourceProperties,
          });
        } else {
          provisioning = getSourceProperty(provisioning);
          const provisioningType = provisioning.type;
          switch (provisioningType.kind) {
            case "Enum":
              const enumType = provisioningType as Enum;
              const missing: string[] = [];
              if (!enumType.members.get("Succeeded")) {
                missing.push("Succeeded");
              }
              if (!enumType.members.get("Canceled")) {
                missing.push("Canceled");
              }
              if (!enumType.members.get("Failed")) {
                missing.push("Failed");
              }
              if (missing.length > 0) {
                context.reportDiagnostic({
                  messageId: "missingValues",
                  format: { missingValues: missing.join(", ") },
                  target: enumType,
                });
              }
              break;
            default:
              context.reportDiagnostic({
                target: provisioning,
              });
          }
        }
      },
    };
  },
});
