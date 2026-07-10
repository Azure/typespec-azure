import {
  Model,
  ModelProperty,
  Program,
  createRule,
  paramMessage,
  type LinterRuleContext,
} from "@typespec/compiler";
import { createTCGCContext } from "../context.js";
import { getLibraryName } from "../public-utils.js";
import { createClientTspAugmentDecoratorCodeFix } from "./codefix-helpers.js";

const acronymMap = new Map([
  ["Db", "DB"],
  ["db", "DB"],
  ["Ip", "IP"],
  ["ip", "IP"],
  ["Os", "OS"],
  ["os", "OS"],
]);

function getCorrectedName(name: string): string | undefined {
  const corrected = name.replace(
    /^db|^ip|^os|Db|Ip|Os/g,
    (match) => acronymMap.get(match) ?? match,
  );
  return corrected === name ? undefined : corrected;
}

function reportIfNeeded(
  context: LinterRuleContext<any>,
  program: Program,
  target: Model | ModelProperty,
  csharpName: string,
) {
  const suggestion = getCorrectedName(csharpName);
  if (suggestion === undefined) return;

  context.reportDiagnostic({
    format: { name: csharpName, suggestion },
    target,
    codefixes: [
      createClientTspAugmentDecoratorCodeFix(target, "clientName", program, [
        `"${suggestion}"`,
        `"csharp"`,
      ]),
    ],
  });
}

export const csharpUseStandardAcronymsRule = createRule({
  name: "csharp-use-standard-acronyms",
  description: "C# SDK names should use standard acronym casing.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/csharp-use-standard-acronyms",
  messages: {
    default: paramMessage`Name '${"name"}' should use standard C# acronym casing (e.g. '${"suggestion"}'). Use @clientName("${"suggestion"}", "csharp") to rename it for C#.`,
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
        reportIfNeeded(
          context,
          context.program,
          model,
          getLibraryName(tcgcContext, model, "csharp"),
        );
      },
      modelProperty: (property: ModelProperty) => {
        if (property.node === undefined) return;
        reportIfNeeded(
          context,
          context.program,
          property,
          getLibraryName(tcgcContext, property, "csharp"),
        );
      },
    };
  },
});
