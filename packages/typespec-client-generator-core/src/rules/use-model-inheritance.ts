import { createRule, fileRef, getTypeName, type Model, paramMessage } from "@typespec/compiler";

export const useModelInheritanceRule = createRule({
  name: "use-model-inheritance",
  description:
    "Model variants of a union with a model extends constraint should explicitly inherit from the base model.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/use-model-inheritance",
  docs: fileRef.fromPackageRoot("src/rules/use-model-inheritance.md"),
  messages: {
    default: paramMessage`Model variant must be '${"baseName"}' or explicitly inherit from it. Use 'model extends ${"baseName"}' instead of relying on structural compatibility.`,
  },
  create(context) {
    return {
      unionVariant(variant) {
        const base = variant.union.baseType;
        if (base?.kind !== "Model" || variant.type.kind !== "Model") {
          return;
        }

        for (let model: Model | undefined = variant.type; model; model = model.baseModel) {
          if (model === base) {
            return;
          }
        }

        context.reportDiagnostic({
          target: variant,
          format: { baseName: getTypeName(base) },
        });
      },
    };
  },
});
