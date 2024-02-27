import { Model, SemanticNodeListener, createRule } from "@typespec/compiler";
import { getArmResources } from "../resource.js";

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
      root: (program) => {
        function isRecordType(model: Model): boolean {
          return model.name === "Record";
        }

        function checkModel(model: Model) {
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
          for (const prop of model.properties.values()) {
            if (prop.type.kind === "Model") {
              if (isRecordType(prop.type)) {
                context.reportDiagnostic({
                  code: "arm-no-record",
                  target: prop,
                  messageId: "default",
                });
              } else {
                checkModel(prop.type);
              }
            }
          }
        }

        // ensure only ARM resources and models they touch are checked
        const resources = getArmResources(context.program);
        for (const resource of resources) {
          checkModel(resource.typespecType);
        }
      },
    };
  },
});
