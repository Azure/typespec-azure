import { ModelProperty, createRule, paramMessage } from "@typespec/compiler";
import { createTCGCContext } from "../context.js";
import { getLibraryName } from "../public-utils.js";
import { createClientTspAugmentDecoratorCodeFix } from "./codefix-helpers.js";

export const csharpNoUrlSuffixRule = createRule({
  name: "csharp-no-url-suffix",
  description:
    "Properties ending with 'Url' should use 'Uri' suffix instead to follow .NET naming conventions.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/csharp-no-url-suffix",
  messages: {
    default: paramMessage`Property '${"propertyName"}' ends with 'Url'. Use 'Uri' suffix instead (e.g. '${"suggestion"}'). Use @clientName("${"suggestion"}", "csharp") to rename it for C#.`,
  },
  create(context) {
    const tcgcContext = createTCGCContext(
      context.program,
      "@azure-tools/typespec-client-generator-core",
      { mutateNamespace: false },
    );
    return {
      modelProperty: (property: ModelProperty) => {
        if (property.node === undefined) return;

        const csharpName = getLibraryName(tcgcContext, property, "csharp");
        if (!csharpName.endsWith("Url")) return;

        const suggestion = csharpName.slice(0, -1) + "i";
        context.reportDiagnostic({
          format: { propertyName: csharpName, suggestion },
          target: property,
          codefixes: [
            createClientTspAugmentDecoratorCodeFix(property, "clientName", context.program, [
              `"${suggestion}"`,
              `"csharp"`,
            ]),
          ],
        });
      },
    };
  },
});
