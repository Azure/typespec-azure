import { getClientApiVersionOverride } from "../decorators.js";
import type { TCGCContext } from "../interfaces.js";
import {
  clientKey,
  listAllUserDefinedNamespaces,
  listScopedDecoratorData,
} from "../internal-utils.js";
import { reportDiagnostic } from "../lib.js";

export function validateClients(context: TCGCContext) {
  const explicitClients = listScopedDecoratorData(context, clientKey);
  if (explicitClients.size === 0) {
    return;
  }

  for (const namespace of listAllUserDefinedNamespaces(context)) {
    for (const target of namespace.interfaces.values()) {
      if (
        getClientApiVersionOverride(context, target) === undefined ||
        !explicitClients.has(target)
      ) {
        continue;
      }

      let parent = target.namespace;
      while (parent && !explicitClients.has(parent)) {
        parent = parent.namespace;
      }

      if (!parent) {
        reportDiagnostic(context.program, {
          code: "invalid-client-api-version-override",
          messageId: "requiresSubclient",
          target,
        });
      }
    }
  }
}
