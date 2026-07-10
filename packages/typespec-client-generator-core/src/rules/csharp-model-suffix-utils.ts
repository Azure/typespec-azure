import { Model, createRule, getNamespaceFullName, paramMessage } from "@typespec/compiler";
import { createTCGCContext } from "../context.js";
import { getLibraryName } from "../public-utils.js";
import { createClientTspAugmentDecoratorCodeFix } from "./codefix-helpers.js";

export interface CSharpModelSuffixRuleOptions {
  name: string;
  badSuffix: string;
  replacementSuffix: string;
  description: string;
  url: string;
  shouldSkip?: (model: Model, csharpName: string) => boolean;
}

function getSuggestedName(name: string, badSuffix: string, replacementSuffix: string) {
  return name.slice(0, -badSuffix.length) + replacementSuffix;
}

export function createCSharpModelSuffixRule(options: CSharpModelSuffixRuleOptions) {
  return createRule({
    name: options.name,
    description: options.description,
    severity: "warning",
    url: options.url,
    messages: {
      default: paramMessage`Model '${"modelName"}' ends with '${"badSuffix"}'. Use '${"replacementSuffix"}' suffix instead (e.g. '${"suggestion"}'). Use @clientName("${"suggestion"}", "csharp") to rename it for C#.`,
    },
    create(context) {
      const tcgcContext = createTCGCContext(
        context.program,
        "@azure-tools/typespec-client-generator-core",
        { mutateNamespace: false },
      );

      return {
        model: (model: Model) => {
          if (model.node === undefined) return;

          const csharpName = getLibraryName(tcgcContext, model, "csharp");
          if (!csharpName.endsWith(options.badSuffix)) return;
          if (options.shouldSkip?.(model, csharpName)) return;

          const suggestion = getSuggestedName(
            csharpName,
            options.badSuffix,
            options.replacementSuffix,
          );
          context.reportDiagnostic({
            format: {
              modelName: csharpName,
              badSuffix: options.badSuffix,
              replacementSuffix: options.replacementSuffix,
              suggestion,
            },
            target: model,
            codefixes: [
              createClientTspAugmentDecoratorCodeFix(model, "clientName", context.program, [
                `"${suggestion}"`,
                `"csharp"`,
              ]),
            ],
          });
        },
      };
    },
  });
}

export function isStandardAzureCoreErrorResponse(model: Model, csharpName: string) {
  if (csharpName !== "ErrorResponse") return false;
  const namespace = model.namespace ? getNamespaceFullName(model.namespace) : "";
  return (
    namespace === "Azure.Core.Foundations" || namespace === "Azure.ResourceManager.CommonTypes"
  );
}
