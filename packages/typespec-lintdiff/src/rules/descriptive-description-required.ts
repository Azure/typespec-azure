import { createRule, getDoc } from "@typespec/compiler";

export const descriptiveDescriptionRequiredRule = createRule({
  name: "descriptive-description-required",
  description:
    "Explicit documentation strings must contain non-whitespace content.",
  severity: "warning",
  messages: {
    default:
      "Descriptions cannot be empty or whitespace-only. Provide a meaningful doc string.",
  },
  create(context) {
    const checkDoc = (target: Parameters<typeof getDoc>[1]) => {
      const doc = getDoc(context.program, target);
      if (doc === undefined) {
        return;
      }

      if (doc.trim().length > 0) {
        return;
      }

      context.reportDiagnostic({
        target,
      });
    };

    return {
      namespace: checkDoc,
      interface: checkDoc,
      operation: checkDoc,
      model: checkDoc,
      modelProperty: checkDoc,
      scalar: checkDoc,
      enum: checkDoc,
      enumMember: checkDoc,
      union: checkDoc,
      unionVariant: checkDoc,
    };
  },
});
