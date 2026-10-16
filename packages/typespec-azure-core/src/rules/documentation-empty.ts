import { getDoc, type LinterRuleContext } from "@typespec/compiler";
import { type DocumentationTarget, type documentationMessages } from "./documentation.js";

export function createEmptyDocumentationValidator(
  context: LinterRuleContext<typeof documentationMessages>,
): (target: DocumentationTarget) => void {
  return (target) => {
    const doc = getDoc(context.program, target);
    if (doc === undefined) {
      return;
    }

    if (doc.trim().length > 0) {
      return;
    }

    context.reportDiagnostic({
      messageId: "empty",
      target,
    });
  };
}
