import { Model, createRule } from "@typespec/compiler";

import { getArmResources } from "../resource.js";
import { getInterface } from "./utils.js";

/**
 * verify an resource should have delete operation
 */
export const deleteOperationMissingRule = createRule({
  name: "no-resource-delete-operation",
  severity: "warning",
  description: "Check for resources that must have a delete operation.",
  messages: {
    default: `The resource must have a delete operation.`,
  },
  create(context) {
    return {
      model: (model: Model) => {
        const resources = getArmResources(context.program);
        const armResource = resources.find((re) => re.typespecType === model);
        if (
          armResource &&
          armResource.operations.lifecycle.createOrUpdate &&
          !armResource.operations.lifecycle.delete
        ) {
          const resourceInterface = getInterface(armResource);
          context.reportDiagnostic({
            target: resourceInterface || model,
          });
        }
      },
    };
  },
});
