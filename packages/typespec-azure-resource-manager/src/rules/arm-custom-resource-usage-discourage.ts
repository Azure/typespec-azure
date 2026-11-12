import {
  createRule,
  fileRef,
  isTemplateInstance,
  type Model,
  type Program,
} from "@typespec/compiler";
import { isCustomAzureResource } from "../resource.js";
import { hasSuppression } from "./utils.js";

const armCustomResourceUsageDiscourageCode =
  "@azure-tools/typespec-azure-resource-manager/arm-custom-resource-usage-discourage";

export const armCustomResourceUsageDiscourage = createRule({
  name: "arm-custom-resource-usage-discourage",
  docs: fileRef.fromPackageRoot("src/rules/arm-custom-resource-usage-discourage.md"),
  severity: "warning",
  description: "Verify the usage of @customAzureResource decorator.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/arm-custom-resource-usage-discourage",
  messages: {
    default: `Avoid using the @customAzureResource decorator. It doesn't provide validation for ARM resources, and its usage should be limited to brownfield services migration.`,
  },
  create(context) {
    return {
      model: (model: Model) => {
        if (
          isCustomAzureResource(context.program, model) &&
          !hasSuppressedCustomResourceTemplateBase(context.program, model)
        ) {
          context.reportDiagnostic({
            code: "arm-custom-resource-usage-discourage",
            target: model,
          });
        }
      },
    };
  },
});

function hasSuppressedCustomResourceTemplateBase(program: Program, model: Model): boolean {
  return hasSuppressedCustomResourceTemplate(program, model, new Set<Model>());
}

function hasSuppressedCustomResourceTemplate(
  program: Program,
  model: Model,
  visited: Set<Model>,
): boolean {
  if (visited.has(model)) {
    return false;
  }
  visited.add(model);

  if (
    isTemplateInstance(model) &&
    hasSuppression(model.node, armCustomResourceUsageDiscourageCode)
  ) {
    return true;
  }

  if (model.baseModel && hasSuppressedCustomResourceTemplate(program, model.baseModel, visited)) {
    return true;
  }

  for (const sourceModel of model.sourceModels) {
    if (hasSuppressedCustomResourceTemplate(program, sourceModel.model, visited)) {
      return true;
    }
  }

  return false;
}
