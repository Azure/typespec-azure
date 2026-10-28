import {
  type DecoratedType,
  type Model,
  type Namespace,
  createRule,
  fileRef,
  getLocationContext,
} from "@typespec/compiler";
import type { DecoratorOptions, LanguageScopes } from "../interfaces.js";
import { normalizeScope, parseScopes } from "../internal-utils.js";

export const useCsharpScopeForDynamicModelRule = createRule({
  name: "use-csharp-scope-for-dynamic-model",
  description: "Dynamic models should specify the C# language scope.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/use-csharp-scope-for-dynamic-model",
  docs: fileRef.fromPackageRoot("src/rules/use-csharp-scope-for-dynamic-model.md"),
  messages: {
    default: 'The @dynamicModel decorator should specify the C# scope ("csharp").',
  },
  create(context) {
    function checkDecorators(type: DecoratedType & (Model | Namespace)) {
      for (const decorator of type.decorators) {
        if (decorator.decorator.name !== "$dynamicModel") {
          continue;
        }
        if (
          decorator.node &&
          getLocationContext(context.program, decorator.node).type !== "project"
        ) {
          continue;
        }

        const scope = normalizeScope(
          decorator.args[0]?.jsValue as LanguageScopes | DecoratorOptions | undefined,
        );
        const [, positiveScopes] = parseScopes(scope);
        if (positiveScopes?.includes("csharp")) {
          continue;
        }

        context.reportDiagnostic({
          target: decorator.node ?? type,
        });
      }
    }

    return {
      model: checkDecorators,
      namespace: checkDecorators,
    };
  },
});
