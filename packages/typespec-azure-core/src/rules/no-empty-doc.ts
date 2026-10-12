import { createRule, fileRef, getDoc } from "@typespec/compiler";

export const noEmptyDocRule = createRule({
  name: "no-empty-doc",
  docs: fileRef.fromPackageRoot("src/rules/no-empty-doc.md"),
  description: "Explicit documentation strings must contain non-whitespace content.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/no-empty-doc",
  messages: {
    default: "Descriptions cannot be empty or whitespace-only. Provide a meaningful doc string.",
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
      enum: (target) => {
        checkDoc(target);
        for (const member of target.members.values()) {
          checkDoc(member);
        }
      },
      union: checkDoc,
      unionVariant: checkDoc,
    };
  },
});
