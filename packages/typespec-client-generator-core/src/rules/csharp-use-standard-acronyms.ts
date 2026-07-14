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
  ["db", "DB"],
  ["ip", "IP"],
  ["os", "OS"],
]);

// Match a known acronym (IP/DB/OS) only when it is a *complete word* within the
// identifier, never a substring that merely starts a longer word. This is what
// keeps "Oslo", "Ipsum" and "Osmosis" from being mangled into "OSlo" etc.
//
// /(?:^ip|^db|^os|Ip|Db|Os)(?![a-z])/g
//   ^ip | ^db | ^os  → lowercase acronym at the start of the name   (e.g. "ipAddress", "osProfile")
//   Ip  | Db  | Os   → capitalized acronym at a camelCase boundary  (e.g. "PublicIpAddress", "CosmosDb")
//   (?![a-z])        → must NOT be followed by a lowercase letter, i.e. the acronym ends a
//                      word (next char is uppercase or end-of-string): keeps "IpAddress"/"MacOs",
//                      but rejects "Oslo" (Os+"lo") and "Ipsum" (Ip+"sum")
//   /g               → fix every acronym occurrence in the identifier
const acronymRegex = /(?:^ip|^db|^os|Ip|Db|Os)(?![a-z])/g;

function getCorrectedName(name: string): string | undefined {
  const corrected = name.replace(
    acronymRegex,
    (match) => acronymMap.get(match.toLowerCase()) ?? match,
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
