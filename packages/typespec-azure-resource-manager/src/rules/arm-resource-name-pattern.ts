import {
  DiagnosticTarget,
  ModelProperty,
  Program,
  createAddDecoratorCodeFix,
  createRule,
  getPattern,
} from "@typespec/compiler";

import { getArmResources } from "../resource.js";

function createPatternCodeFix(diagnosticTarget: DiagnosticTarget) {
  return createAddDecoratorCodeFix(diagnosticTarget, "pattern", ['"^[a-zA-Z0-9-]{3,24}$"']);
}

/**
 * Verify that a delete operation only
 */
export const armResourceNamePatternRule = createRule({
  name: "arm-resource-name-pattern",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/resource-name-pattern",
  description: "The resource name parameter should be defined with a 'pattern' restriction.",
  messages: {
    default: `The resource name parameter should be defined with a 'pattern' restriction.  Please use 'ResourceNameParameter' to specify the name parameter with options to override default pattern RegEx expression.`,
  },
  create(context) {
    return {
      root: (program: Program) => {
        const resources = getArmResources(program);
        for (const resource of resources) {
          // find the name property
          const nameProperty = resource.typespecType.properties.get("name");
          if (nameProperty !== undefined) {
            if (!hasPattern(program, nameProperty)) {
              context.reportDiagnostic({
                target: nameProperty,
                codefixes: [createPatternCodeFix(nameProperty)],
              });
            }
          }
        }
      },
    };
  },
});

function hasPattern(program: Program, property: ModelProperty): boolean {
  const pattern = getPattern(program, property);
  if (pattern !== undefined) {
    return true;
  }

  if (property.type.kind === "Scalar") {
    const pattern = getPattern(program, property.type);
    if (pattern !== undefined) {
      return true;
    }
  }
  return false;
}
