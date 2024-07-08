import { Enum, listServices, Model, Program } from "@typespec/compiler";
import { AllScopes, getClientNameOverride } from "./decorators.js";
import { createTCGCContext, DuplicateTracker, TCGCContext } from "./internal-utils.js";
import { createStateSymbol, reportDiagnostic } from "./lib.js";

export function $onValidate(program: Program) {
  const tcgcContext = createTCGCContext(program);
  const languageScopes = getDefinedLanguageScopes(program);
  validateModels(program, tcgcContext, languageScopes);
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

function validateModels(
  program: Program,
  tcgcContext: TCGCContext,
  languageScopes: Set<string | symbol>
) {
  const services = listServices(program);
  for (const service of services) {
    const duplicateTracker = new DuplicateTracker<string, Model | Enum>();
    for (const languageScope of languageScopes) {
      for (const model of [...service.type.models.values(), ...service.type.enums.values()]) {
        const clientName = getClientNameOverride(tcgcContext, model, languageScope);
        const name = clientName ?? model.name;
        duplicateTracker.track(name, model);
      }
    }

    for (const [modelName, duplicates] of duplicateTracker.entries()) {
      for (const model of duplicates) {
        reportDiagnostic(program, {
          code: "duplicate-model-name",
          format: { modelName },
          target: model,
        });
      }
    }
  }
}
