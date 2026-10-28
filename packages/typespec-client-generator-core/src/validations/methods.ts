import { getLroProtocolMetadata } from "@azure-tools/typespec-azure-core";
import { isTemplateDeclaration } from "@typespec/compiler";
import { getClientNameOverride } from "../decorators.js";
import type { TCGCContext } from "../interfaces.js";
import {
  clientLroResultKey,
  type ClientLroResultReference,
  listScopedDecoratorData,
  negationScopesKey,
  overrideKey,
} from "../internal-utils.js";
import { reportDiagnostic } from "../lib.js";
import { resolveClientLroResult } from "../lro-metadata.js";

export function validateMethods(context: TCGCContext) {
  validateClientNameNotOnOverriddenMethods(context);
  validateClientLroResults(context);
}

function validateClientLroResults(context: TCGCContext) {
  for (const [operation, scopes] of context.program.stateMap(clientLroResultKey)) {
    if (operation.kind !== "Operation" || isTemplateDeclaration(operation)) continue;
    const references = new Set<ClientLroResultReference>();
    for (const key of Reflect.ownKeys(scopes)) {
      if (key !== negationScopesKey) references.add(scopes[key]);
    }
    const protocol = getLroProtocolMetadata(context.program, operation);
    for (const reference of references) {
      const [, diagnostics] = resolveClientLroResult(context.program, protocol, reference);
      // Completion-source restrictions apply only in the active language context.
      context.program.reportDiagnostics(
        diagnostics.filter(
          (diagnostic) =>
            diagnostic.code !==
            "@azure-tools/typespec-client-generator-core/unsupported-client-lro-result",
        ),
      );
    }
  }
}

function validateClientNameNotOnOverriddenMethods(context: TCGCContext) {
  for (const [original, override] of listScopedDecoratorData(context, overrideKey)) {
    const clientNameOverride = getClientNameOverride(context, override);
    if (clientNameOverride) {
      reportDiagnostic(context.program, {
        code: "client-name-ineffective",
        target: override,
        format: {
          name: clientNameOverride,
          originalMethodName: original.kind === "Operation" ? original.name : "<unknown>",
        },
      });
    }
  }
}
