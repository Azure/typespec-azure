import { Model, createRule } from "@typespec/compiler";

import { getParentResource } from "@typespec/rest";
import { isTrackedResource } from "./utils.js";

/**
 * verify if resource nesting beyond 3 levels
 */

export const beyondNestingRule = createRule({
  name: "beyond-nesting-levels",
  severity: "warning",
  description: "Tracked Resources must use 3 or fewer levels of nesting.",
  messages: {
    default: "Tracked Resources must use 3 or fewer levels of nesting.",
  },
  create(context) {
    return {
      model: (model: Model) => {
        let levels = 1;
        if (!isTrackedResource(model)) {
          return;
        }
        let parent: Model | undefined = model;
        while (levels < 4) {
          parent = getParentResource(context.program, parent);
          if (parent) {
            levels++;
          } else {
            break;
          }
        }
        if (levels === 4) {
          context.reportDiagnostic({
            target: model,
          });
        }
      },
    };
  },
});
