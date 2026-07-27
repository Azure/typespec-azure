import { createRule, getDoc, getSummary } from "@typespec/compiler";

export const summaryAndDescriptionMustNotBeSameRule = createRule({
  name: "summary-and-description-must-not-be-same",
  description: "Operations must not use identical summary and description text.",
  severity: "warning",
  messages: {
    default: "The summary and description values should not be same.",
  },
  create(context) {
    return {
      operation: (operation) => {
        const summary = getSummary(context.program, operation);
        const description = getDoc(context.program, operation);

        if (
          summary === undefined ||
          description === undefined ||
          summary.trim() !== description.trim()
        ) {
          return;
        }

        context.reportDiagnostic({
          target: operation,
        });
      },
    };
  },
});
