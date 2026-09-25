import {
  createRule,
  fileRef,
  getTypeName,
  type Model,
  paramMessage,
  type Union,
} from "@typespec/compiler";

export const useUnionHierarchyRule = createRule({
  name: "use-union-hierarchy",
  description:
    "Named unions should declare an extends constraint, with model variants inheriting from the base and belonging to only one union hierarchy.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/use-union-hierarchy",
  docs: fileRef.fromPackageRoot("src/rules/use-union-hierarchy.md"),
  messages: {
    default: paramMessage`Model variant must be '${"baseName"}' or explicitly inherit from it. Use 'model extends ${"baseName"}' instead of relying on structural compatibility.`,
    "missing-extends":
      "Named unions must declare an 'extends' constraint. Use 'union Name extends Base'.",
    "multiple-unions": paramMessage`Model '${"modelName"}' is already a variant of union '${"unionName"}'. A model can be a variant of only one union with a model extends constraint.`,
  },
  create(context) {
    const modelUnions = new Map<Model, Union>();

    return {
      union(union) {
        if (union.name && !union.baseType) {
          context.reportDiagnostic({
            target: union,
            messageId: "missing-extends",
          });
        }
      },
      unionVariant(variant) {
        const base = variant.union.baseType;
        if (base?.kind !== "Model" || variant.type.kind !== "Model") {
          return;
        }

        const owner = modelUnions.get(variant.type);
        if (owner && owner !== variant.union) {
          context.reportDiagnostic({
            target: variant,
            messageId: "multiple-unions",
            format: {
              modelName: getTypeName(variant.type),
              unionName: getTypeName(owner),
            },
          });
        } else {
          modelUnions.set(variant.type, variant.union);
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
