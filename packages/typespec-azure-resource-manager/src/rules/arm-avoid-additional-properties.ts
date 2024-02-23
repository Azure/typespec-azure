import { Model, SemanticNodeListener, createRule } from "@typespec/compiler";

function isRecordType(model: Model): boolean {
  return model.name === "Record";
}

export const armAvoidAdditionalPropertiesRule = createRule({
  name: "arm-avoid-additional-properties",
  severity: "warning",
  description: "Avoid use of additional properties in ARM resources.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/avoid-additional-properties",
  messages: {
    default:
      "Definitions must not be of type Record. ARM requires Resource provider teams to define types explicitly.",
    extends:
      "Definitions must not extend type Record. ARM requires Resource provider teams to define types explicitly.",
    is: "Definitions must not equate to type Record. ARM requires Resource provider teams to define types explicitly.",
  },
  create(context): SemanticNodeListener {
    return {
      model: (model: Model) => {
        for (const prop of model.properties.values()) {
          if (prop.type.kind === "Model" && isRecordType(prop.type)) {
            context.reportDiagnostic({
              code: "arm-avoid-additional-properties",
              target: prop,
            });
          }
        }
        if (model.baseModel !== undefined && isRecordType(model.baseModel)) {
          context.reportDiagnostic({
            code: "arm-avoid-additional-properties",
            target: model,
            messageId: "extends",
          });
        }
        if (model.sourceModel !== undefined && isRecordType(model.sourceModel)) {
          context.reportDiagnostic({
            code: "arm-avoid-additional-properties",
            target: model,
            messageId: "is",
          });
        }
      },
    };
  },
});
