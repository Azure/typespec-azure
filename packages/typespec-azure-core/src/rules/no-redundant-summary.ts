import { createRule, fileRef, getDoc, getSummary, type Type } from "@typespec/compiler";

export const noRedundantSummaryRule = createRule({
  name: "no-redundant-summary",
  docs: fileRef.fromPackageRoot("src/rules/no-redundant-summary.md"),
  description: "Summary must not repeat the documentation.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/no-redundant-summary",
  messages: {
    default:
      "The summary and documentation are identical. Add detail to the documentation or omit the redundant summary.",
  },
  create(context) {
    function checkSummary(target: Type) {
      const summary = getSummary(context.program, target);
      const doc = getDoc(context.program, target);

      if (!summary || !doc || summary.trim() !== doc.trim()) {
        return;
      }

      context.reportDiagnostic({ target });
    }

    return {
      namespace: checkSummary,
      interface: checkSummary,
      operation: checkSummary,
      model: checkSummary,
      modelProperty: checkSummary,
      scalar: checkSummary,
      enum: (target) => {
        checkSummary(target);
        for (const member of target.members.values()) {
          checkSummary(member);
        }
      },
      union: checkSummary,
      unionVariant: checkSummary,
    };
  },
});
