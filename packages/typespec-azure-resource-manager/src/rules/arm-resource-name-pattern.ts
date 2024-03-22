import {
  DiagnosticTarget,
  Program,
  SourceLocation,
  createRule,
  defineCodeFix,
  getPattern,
  getSourceLocation,
} from "@typespec/compiler";

import { isWhiteSpace } from "../../../../core/packages/compiler/src/core/charcode.js";
import { getArmResources } from "../resource.js";

// TODO: Replace this with a reusable implementation from the compiler package when implemented.
// Issue: https://github.com/microsoft/typespec/issues/3044
function createPatternCodeFix(diagnosticTarget: DiagnosticTarget) {
  return defineCodeFix({
    id: "add-pattern-decorator",
    label: "Add `@pattern` decorator to the resource name property with the default ARM pattern.",
    fix: (context) => {
      const location = getSourceLocation(diagnosticTarget);
      const { lineStart, indent } = findLineStartAndIndent(location);
      const updatedLocation = { ...location, pos: lineStart };
      return context.prependText(updatedLocation, `${indent}@pattern(/^[a-zA-Z0-9-]+$/)\n`);
    },
  });
}

function findLineStartAndIndent(location: SourceLocation): { lineStart: number; indent: string } {
  const text = location.file.text;
  let pos = location.pos;
  let indent = 0;
  while (pos > 0 && text[pos - 1] !== "\n") {
    if (isWhiteSpace(text.charCodeAt(pos - 1))) {
      indent++;
    } else {
      indent = 0;
    }
    pos--;
  }
  return { lineStart: pos, indent: location.file.text.slice(pos, pos + indent) };
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
                codefixes: [createPatternCodeFix(nameProperty)],
              });
            }
          }
        }
      },
    };
  },
});
