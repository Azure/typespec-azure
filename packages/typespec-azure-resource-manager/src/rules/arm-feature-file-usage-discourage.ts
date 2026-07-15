import { createRule, Namespace } from "@typespec/compiler";
import { getFeatureFileSet } from "../resource.js";

export const armFeatureFileUsageDiscourage = createRule({
  name: "arm-feature-file-usage-discourage",
  severity: "warning",
  description: "Verify the usage of @featureFiles decorator.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/arm-feature-file-usage-discourage",
  messages: {
    default: `Avoid using the @featureFiles decorator. Its usage should be limited to brownfield services migration and requires explicit approval.`,
  },
  create(context) {
    return {
      namespace: (namespace: Namespace) => {
        if (getFeatureFileSet(context.program, namespace)) {
          context.reportDiagnostic({
            code: "arm-feature-file-usage-discourage",
            target: namespace,
          });
        }
      },
    };
  },
});
