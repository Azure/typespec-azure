import { createRule, fileRef, isTemplateDeclarationOrInstance } from "@typespec/compiler";
import { isProviderOperation, isResourceOperation } from "../operations.js";
import { isInternalTypeSpec, isTemplatedInterfaceOperation } from "./utils.js";

export const providerOrResourceOperationRule = createRule({
  name: "provider-or-resource-operation",
  description: "Ensure every ARM operation is registered as a provider or resource operation.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/provider-or-resource-operation",
  docs: fileRef.fromPackageRoot("src/rules/provider-or-resource-operation.md"),
  messages: {
    default:
      "ARM operations must be registered as provider or resource operations. Use standard templates such as ArmProviderActionSync, ArmResourceRead, or Extension.Read, or apply @providerOperation to a custom provider operation.",
  },
  create(context) {
    return {
      operation(operation) {
        if (
          !isTemplateDeclarationOrInstance(operation) &&
          !isTemplatedInterfaceOperation(operation) &&
          !isInternalTypeSpec(context.program, operation) &&
          !isProviderOperation(context.program, operation) &&
          !isResourceOperation(context.program, operation)
        ) {
          context.reportDiagnostic({ target: operation });
        }
      },
    };
  },
});
