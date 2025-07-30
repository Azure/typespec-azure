import { getNamespaceFullName, getTypeName, type Operation } from "@typespec/compiler";
import { useStateSet } from "@typespec/compiler/utils";
import { getResourceTypeKey, getSegment } from "@typespec/rest";
import type { EnsureResourceTypeDecorator } from "../../../generated-defs/Azure.Core.Foundations.Private.js";
import { AzureCoreStateKeys, reportDiagnostic } from "../../lib.js";

export const [isResourceOperation, markResourceOperation] = useStateSet<Operation>(
  AzureCoreStateKeys.resourceOperation,
);

export const $ensureResourceType: EnsureResourceTypeDecorator = (context, entity, resourceType) => {
  if (resourceType.kind === "TemplateParameter") {
    return;
  }

  // Mark the operation as a resource operation
  markResourceOperation(context.program, entity);

  if (resourceType.kind !== "Model") {
    context.program.reportDiagnostic({
      code: "invalid-argument",
      message: `This operation expects a Model for its TResource parameter.`,
      severity: "error",
      target: entity,
    });

    return;
  }

  // If the operation is defined under Azure.Core, ignore these diagnostics.
  // We're only concerned with user-defined operations.
  if (entity.namespace && getNamespaceFullName(entity.namespace).startsWith("Azure.Core")) {
    return;
  }

  const key = getResourceTypeKey(context.program, resourceType);
  if (!key) {
    reportDiagnostic(context.program, {
      code: "invalid-resource-type",
      target: entity,
      messageId: "missingKey",
      format: {
        name: getTypeName(resourceType),
      },
    });

    return;
  }

  if (!getSegment(context.program, key.keyProperty)) {
    reportDiagnostic(context.program, {
      code: "invalid-resource-type",
      target: entity,
      messageId: "missingSegment",
      format: {
        name: getTypeName(resourceType),
      },
    });
  }
};
