import { createRule, fileRef, getDoc, getSummary } from "@typespec/compiler";

export const noIdenticalSummaryAndDescriptionRule = createRule({
  name: "no-identical-summary-and-description",
  docs: fileRef.fromPackageRoot("src/rules/no-identical-summary-and-description.md"),
  description: "Operations must not use identical summary and description text.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/no-identical-summary-and-description",
  messages: {
    default: "Use a description that adds detail beyond the operation summary.",
  },
  create(context) {
    return {
      operation: (operation) => {
        const summary = getSummary(context.program, operation);
        const description = getDoc(context.program, operation);

        if (!summary || !description || summary.trim() !== description.trim()) {
          return;
        }

        context.reportDiagnostic({
          target: operation,
        });
      },
    };
  },
});
