import { Model, SemanticNodeListener, createRule } from "@typespec/compiler";

function isRecordType(model: Model): boolean {
  return model.name === "Record";
}

export const armAvoidAdditionalPropertiesRule = createRule({
  name: "arm-avoid-additional-properties",
  severity: "warning",
  description: "Avoid use of additional properties in ARM resources.",
  messages: {
    default: "...",
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
          });
        }
        if (model.sourceModel !== undefined && isRecordType(model.sourceModel)) {
          context.reportDiagnostic({
            code: "arm-avoid-additional-properties",
            target: model,
          });
        }
      },
    };
  },
});
