import { Enum, listServices, Model, Program } from "@typespec/compiler";
import { DuplicateTracker } from "@typespec/compiler/utils";
import { getClientNameOverride } from "./decorators.js";
import { AllScopes, createTCGCContext, TCGCContext } from "./internal-utils.js";
import { createStateSymbol, reportDiagnostic } from "./lib.js";

export function $onValidate(program: Program) {
  const tcgcContext = createTCGCContext(program);
  const languageScopes = getDefinedLanguageScopes(program);
  for (const scope of languageScopes) {
    validateClientNamesPerScope(program, tcgcContext, scope);
  }
}

function getDefinedLanguageScopes(program: Program): Set<string | symbol> {
  const languageScopes = new Set<string | symbol>();
  const stateMap = program.stateMap(createStateSymbol("clientName"));
  for (const value of stateMap.values()) {
    if (value[AllScopes]) {
      languageScopes.add(AllScopes);
    }
    for (const languageScope of Object.keys(value)) {
      languageScopes.add(languageScope);
    }
  }
  return languageScopes;
}

function validateClientNamesPerScope(
  program: Program,
  tcgcContext: TCGCContext,
  scope: string | symbol
) {
  const services = listServices(program);
  for (const service of services) {
    const duplicateTracker = new DuplicateTracker<string, Model | Enum>();
    for (const model of [...service.type.models.values(), ...service.type.enums.values()]) {
      const clientName = getClientNameOverride(tcgcContext, model, scope);
      const name = clientName ?? model.name;
      duplicateTracker.track(name, model);
    }
    for (const [name, duplicates] of duplicateTracker.entries()) {
      for (const model of duplicates) {
        if (scope === AllScopes) {
          reportDiagnostic(program, {
            code: "duplicate-name",
            format: { name, scope: "AllScopes" },
            target: model,
          });
        }
        if (typeof scope === "string") {
          reportDiagnostic(program, {
            code: "duplicate-name",
            format: { name, scope },
            target: model,
          });
        }
      }
    }
  }
}
