import {
  DiagnosticTarget,
  Model,
  SemanticNodeListener,
  Type,
  createRule,
} from "@typespec/compiler";

export const armNoRecordRule = createRule({
  name: "arm-no-record",
  severity: "warning",
  description: "Don't use Record types for ARM resources.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/arm-no-record",
  messages: {
    default:
      "Model properties or operation parameters should not be of type Record. ARM requires Resource provider teams to define types explicitly.",
    extends:
      "Models should not extend type Record. ARM requires Resource provider teams to define types explicitly.",
    is: "Models should not equate to type Record. ARM requires Resource provider teams to define types explicitly.",
  },
  create(context): SemanticNodeListener {
    function checkModel(model: Model) {
      if (model.baseModel !== undefined) {
        checkNoRecord(model.baseModel, model, "extends");
      } else if (model.sourceModel !== undefined) {
        checkNoRecord(model.sourceModel, model, "is");
      }
    }

    function checkNoRecord(type: Type, target: DiagnosticTarget, kind?: "extends" | "is") {
      if (type.kind === "Model" && type.name === "Record") {
        context.reportDiagnostic({
          code: "arm-no-record",
          target: target,
          messageId: kind || "default",
        });
      }
    }

    return {
      operation: (op) => checkNoRecord(op.returnType, op),
      model: (type) => checkModel(type),
      modelProperty: (prop) => checkNoRecord(prop.type, prop),
      unionVariant: (variant) => checkNoRecord(variant.type, variant),
    };
  },
});
