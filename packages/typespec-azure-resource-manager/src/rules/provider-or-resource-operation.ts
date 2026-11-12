import {
  createRule,
  fileRef,
  isTemplateDeclarationOrInstance,
  paramMessage,
} from "@typespec/compiler";
import {
  getArmResourceOperationData,
  getOriginalResourceOperationModels,
  isArmCollectionAction,
  isProviderOperation,
} from "../operations.js";
import { getArmResource } from "../private.decorators.js";
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
    unregisteredResource: paramMessage`The resource "${"resourceName"}" for this operation is not a registered ARM resource. Use standard resource templates to create resources.`,
    missingInterface: "Resource operations must be defined inside an interface",
    mixedRegistration:
      "This operation is registered as both a provider operation and a resource operation. Remove @providerOperation or the resource operation registration.",
  },
  create(context) {
    const modelsByOperation = getOriginalResourceOperationModels(context.program);
    return {
      operation(operation) {
        if (
          isTemplateDeclarationOrInstance(operation) ||
          isTemplatedInterfaceOperation(operation) ||
          isInternalTypeSpec(context.program, operation)
        )
          return;
        const resourceOperation = getArmResourceOperationData(context.program, operation);
        if (isProviderOperation(context.program, operation)) {
          if (resourceOperation !== undefined) {
            context.reportDiagnostic({ target: operation, messageId: "mixedRegistration" });
          }
          return;
        }
        if (
          [...(modelsByOperation.get(operation) ?? [])].some(
            (model) => getArmResource(context.program, model) !== undefined,
          )
        )
          return;
        if (
          operation.interface === undefined &&
          !isArmCollectionAction(context.program, operation)
        ) {
          context.reportDiagnostic({ target: operation, messageId: "missingInterface" });
        } else if (resourceOperation) {
          context.reportDiagnostic({
            target: operation,
            messageId: "unregisteredResource",
            format: { resourceName: resourceOperation.resourceModelName },
          });
        } else {
          context.reportDiagnostic({ target: operation });
        }
      },
    };
  },
});
