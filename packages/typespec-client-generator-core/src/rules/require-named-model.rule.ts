import { createRule, Model, paramMessage } from "@typespec/compiler";
import { createTCGCContext } from "../context.js";
import { createSdkPackage } from "../package.js";

export const requireNamedModelRule = createRule({
  name: "require-named-model",
  description: "Requires models to be named rather than defined anonymously or inline.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/require-named-model",
  messages: {
    default: paramMessage`Anonymous model detected. Define this model separately with a proper name to improve code readability and reusability.`,
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
        if (createdModel && createdModel.isGeneratedName) {
          context.reportDiagnostic({
            target: model,
            format: {
              generatedName: createdModel.name,
            },
          });
        }
      },
    };
  },
});
