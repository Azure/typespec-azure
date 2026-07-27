import { createRule, paramMessage } from "@typespec/compiler";
import {
  getArmProviderNamespace,
  isArmProviderNamespace,
} from "@azure-tools/typespec-azure-resource-manager";

// Matches: Microsoft.Xxx(.Yyy)* where each segment after the dot is PascalCase
// Allows up to 3 uppercase letters in a row for acronyms (e.g., Microsoft.HDInsight)
const pascalCaseProviderRegex =
  /^[A-Z][a-z0-9]+(\.[A-Z]{1,3}[a-z0-9]+([A-Z]{1,3}[a-z0-9]*)*[A-Z]{0,2})+$/;

export const pathResourceProviderNamePascalCaseRule = createRule({
  name: "path-resource-provider-name-pascal-case",
  description:
    "ARM provider namespace must follow PascalCase (e.g., Microsoft.Compute).",
  severity: "warning",
  messages: {
    default:
      paramMessage`The ARM provider namespace "${"providerNamespace"}" must use PascalCase (e.g., Microsoft.Compute).`,
  },
  create(context) {
    return {
      namespace: (namespace) => {
        if (!isArmProviderNamespace(context.program, namespace)) {
          return;
        }

        const providerNamespace = getArmProviderNamespace(
          context.program,
          namespace,
        );
        if (!providerNamespace) {
          return;
        }

        if (!pascalCaseProviderRegex.test(providerNamespace)) {
          context.reportDiagnostic({
            target: namespace,
            format: { providerNamespace },
          });
        }
      },
    };
  },
});
