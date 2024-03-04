import { Program, createRule, getPattern } from "@typespec/compiler";

import { getArmResources } from "../resource.js";

/**
 * Verify that a delete operation only
 */
export const armResourceNamePatternRule = createRule({
  name: "arm-resource-name-pattern",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/resource-name-pattern",
  description: "The resource name parameter should be defined with a 'pattern' restriction.",
  messages: {
    default: `The resource name parameter should be defined with a 'pattern' restriction.`,
  },
  create(context) {
    return {
      root: (program: Program) => {
        const resources = getArmResources(program);
        for (const resource of resources) {
          // find the name property
          const nameProperty = [...resource.typespecType.properties.values()].find(
            (p) => p.name === "name"
          );
          if (nameProperty !== undefined) {
            const pattern = getPattern(program, nameProperty);
            if (pattern === undefined) {
              context.reportDiagnostic({
                target: nameProperty,
              });
            }
          }
        }
      },
    };
  },
});
