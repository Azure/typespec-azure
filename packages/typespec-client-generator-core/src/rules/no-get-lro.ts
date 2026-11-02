import { createRule, fileRef, isTemplateDeclarationOrInstance } from "@typespec/compiler";
import { getAllHttpServices, type HttpOperation } from "@typespec/http";
import { createTCGCContext } from "../context.js";
import { getMarkAsLro, markAsLroKey } from "../decorators.js";
import { AllScopes } from "../internal-utils.js";

export const noGetLroRule = createRule({
  name: "no-get-lro",
  description: "GET SDK operations must not be marked as long-running.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/no-get-lro",
  docs: fileRef.fromPackageRoot("src/rules/no-get-lro.md"),
  messages: {
    default:
      "GET SDK operations must not be marked as long-running. Remove the Legacy.markAsLro declaration.",
  },
  create(context) {
    const tcgcContext = createTCGCContext(
      context.program,
      "@azure-tools/typespec-client-generator-core",
      { mutateNamespace: false },
    );
    let operations: Map<HttpOperation["operation"], HttpOperation> | undefined;
    return {
      operation(op) {
        if (isTemplateDeclarationOrInstance(op)) return;
        operations ??= new Map(
          getAllHttpServices(context.program)[0].flatMap((service) =>
            service.operations.map((httpOperation) => [httpOperation.operation, httpOperation]),
          ),
        );
        if (operations.get(op)?.verb !== "get") return;
        const scopes: (string | typeof AllScopes)[] = [
          AllScopes,
          ...Object.keys(context.program.stateMap(markAsLroKey).get(op) ?? {}),
        ];
        if (scopes.some((scope) => getMarkAsLro(tcgcContext, op, scope))) {
          context.reportDiagnostic({ target: op });
        }
      },
    };
  },
});
