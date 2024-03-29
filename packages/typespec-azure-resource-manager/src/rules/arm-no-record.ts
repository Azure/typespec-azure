import { DiagnosticTarget, Model, SemanticNodeListener, createRule } from "@typespec/compiler";
import { getArmResources } from "../resource.js";

export const armNoRecordRule = createRule({
  name: "arm-no-record",
  severity: "warning",
  description: "Don't use Record types for ARM resources.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/no-record",
  messages: {
    default:
      "Model properties or operation parameters should not be of type Record. ARM requires Resource provider teams to define types explicitly.",
    extends:
      "Models should not extend type Record. ARM requires Resource provider teams to define types explicitly.",
    is: "Models should not equate to type Record. ARM requires Resource provider teams to define types explicitly.",
  },
  create(context): SemanticNodeListener {
    return {
      root: (_) => {
        function checkModel(model: Model, target: DiagnosticTarget, kind?: "extends" | "is") {
          if (model.name === "Record") {
            context.reportDiagnostic({
              code: "arm-no-record",
              target: target,
              messageId: kind || "default",
            });
          } else if (model.baseModel !== undefined) {
            checkModel(model.baseModel, model, "extends");
          } else if (model.sourceModel !== undefined) {
            checkModel(model.sourceModel, model, "is");
          }
          if (model?.properties !== undefined) {
            for (const prop of model.properties.values()) {
              if (prop.type.kind === "Model") {
                checkModel(prop.type, prop);
              }
            }
          }
        }

        // ensure only ARM resources and models they touch are checked
        const resources = getArmResources(context.program);
        for (const resource of resources) {
          checkModel(resource.typespecType, resource.typespecType);
        }
      },
    };
  },
});
