import { getClientApiVersionOverride } from "../decorators.js";
import type { TCGCContext } from "../interfaces.js";
import { reportDiagnostic } from "../lib.js";

export function validateClients(context: TCGCContext) {
  for (const client of context.getClients()) {
    if (
      client.parent === undefined &&
      client.type?.kind === "Interface" &&
      getClientApiVersionOverride(context, client.type) !== undefined
    ) {
      reportDiagnostic(context.program, {
        code: "invalid-client-api-version-override",
        messageId: "requiresSubclient",
        target: client.type,
      });
    }
  }
}
