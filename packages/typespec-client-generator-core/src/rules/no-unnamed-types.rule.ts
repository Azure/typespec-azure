import { createRule, Model, paramMessage, Union } from "@typespec/compiler";
import { createTCGCContext } from "../context.js";
import { UsageFlags } from "../interfaces.js";
import { createSdkPackage } from "../package.js";

export const noUnnamedTypesRule = createRule({
  name: "no-unnamed-types",
  description: "Requires types to be named rather than defined anonymously or inline.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/no-unnamed-types",
  messages: {
    default: paramMessage`Anonymous ${"type"} with generated name "${"generatedName"}" detected. Define this ${"type"} separately with a proper name to improve code readability and reusability.`,
  },
  create(context) {
    const tcgcContext = createTCGCContext(
      context.program,
      "@azure-tools/typespec-client-generator-core",
    );
    // we create the package to see if the model is used in the final output
    createSdkPackage(tcgcContext);
    return {
      model: (model: Model) => {
        const createdModel = tcgcContext.__referencedTypeCache.get(model);
        if (
          createdModel &&
          createdModel.usage !== UsageFlags.None &&
          createdModel.isGeneratedName
        ) {
          context.reportDiagnostic({
            target: model,
            format: {
              type: "model",
              generatedName: createdModel.name,
            },
          });
        }
      },
      union: (union: Union) => {
        const createdUnion = tcgcContext.__referencedTypeCache.get(union);
        if (
          createdUnion &&
          createdUnion.usage !== UsageFlags.None &&
          createdUnion.isGeneratedName
        ) {
          context.reportDiagnostic({
            target: union,
            format: {
              type: "union",
              generatedName: createdUnion.name,
            },
          });
        }
      },
    };
  },
});
