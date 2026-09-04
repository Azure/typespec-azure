import type { DiagnosticTarget } from "@typespec/compiler";
import { AllScopes } from "../internal-utils.js";
import { createDiagnostic } from "../lib.js";

export function createDuplicateClientNameDiagnostic(
  name: string,
  scope: string | typeof AllScopes,
  target: DiagnosticTarget,
  isOperation: boolean,
  messageId: "default" | "nonDecorator",
) {
  return createDiagnostic({
    // .NET supports operations with the same name through overloads.
    code:
      scope === "csharp" && isOperation ? "duplicate-client-name-warning" : "duplicate-client-name",
    messageId,
    format: { name, scope: scope === AllScopes ? "AllScopes" : scope },
    target,
  });
}
