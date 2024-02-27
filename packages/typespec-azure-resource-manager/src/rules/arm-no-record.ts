import { Model, SemanticNodeListener, createRule } from "@typespec/compiler";

function isRecordType(model: Model): boolean {
  return model.name === "Record";
}

export const armNoRecordRule = createRule({
  name: "arm-no-record",
  severity: "warning",
  description: "Don't use Record types for ARM resources.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/no-record",
  messages: {
    default:
      "Properties should not be of type Record. ARM requires Resource provider teams to define types explicitly.",
    extends:
      "Models should not extend type Record. ARM requires Resource provider teams to define types explicitly.",
    is: "Models should not equate to type Record. ARM requires Resource provider teams to define types explicitly.",
  },
  create(context): SemanticNodeListener {
    return {
      model: (model: Model) => {
        for (const prop of model.properties.values()) {
          if (prop.type.kind === "Model" && isRecordType(prop.type)) {
            context.reportDiagnostic({
              code: "arm-no-record",
              target: prop,
            });
          }
        }
        if (model.baseModel !== undefined && isRecordType(model.baseModel)) {
          context.reportDiagnostic({
            code: "arm-no-record",
            target: model,
            messageId: "extends",
          });
        }
        if (model.sourceModel !== undefined && isRecordType(model.sourceModel)) {
          context.reportDiagnostic({
            code: "arm-no-record",
            target: model,
            messageId: "is",
          });
        }
      },
    };
  },
});
