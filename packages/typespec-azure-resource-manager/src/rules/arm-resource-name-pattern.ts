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
    default: `The resource name parameter should be defined with a 'pattern' restriction.  Decorate the "name" property in the resource definition using the @pattern decorator, with a regular expression indicating the allowed characters in the resource name.`,
  },
  create(context) {
    return {
      root: (program: Program) => {
        const resources = getArmResources(program);
        for (const resource of resources) {
          // find the name property
          const nameProperty = resource.typespecType.properties.get("name");
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
